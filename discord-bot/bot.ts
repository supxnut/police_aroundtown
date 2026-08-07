import { Client, GatewayIntentBits, Partials, Message, Channel } from 'discord.js';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import https from 'https';
import { query, queryOne } from '../backend/database/db.js';
import { DutyValidationService } from '../backend/services/dutyValidationService.js';
import { parseDiscordLog } from '../backend/controllers/discordParserController.js';
import { realtimeService } from '../backend/services/realtimeService.js';

dotenv.config({ path: path.join(process.cwd(), '.env') });

const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
const DUTY_CHANNEL_ID = process.env.DISCORD_DUTY_CHANNEL_ID || '';
const CASE_CHANNEL_ID = process.env.DISCORD_CASE_CHANNEL_ID || '';
const ANNOUNCEMENT_CHANNEL_ID = process.env.DISCORD_ANNOUNCEMENT_CHANNEL_ID || '';
const SYSTEM_CHANNEL_ID = process.env.DISCORD_SYSTEM_CHANNEL_ID || '';

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildPresences,
  ],
  partials: [Partials.Message, Partials.Channel, Partials.Reaction],
});

// Helper: Download attachment images
async function downloadAttachment(url: string, filename: string): Promise<string> {
  const uploadDir = path.join(process.cwd(), 'uploads', 'cases');
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  const safeFilename = `${Date.now()}_${filename.replace(/[^a-zA-Z0-9_.-]/g, '_')}`;
  const filePath = path.join(uploadDir, safeFilename);

  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(filePath);
    https.get(url, (response) => {
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve(`/uploads/cases/${safeFilename}`);
      });
    }).on('error', (err) => {
      fs.unlink(filePath, () => {});
      reject(err);
    });
  });
}

// Convert Discord Message (including Embeds, Fields, Attachments) to clean text for Gemini
function formatMessageToCleanText(msg: Message): string {
  let lines: string[] = [];

  if (msg.content) {
    lines.push(`[Content]: ${msg.content}`);
  }

  if (msg.embeds && msg.embeds.length > 0) {
    for (const embed of msg.embeds) {
      if (embed.title) lines.push(`[Embed Title]: ${embed.title}`);
      if (embed.description) lines.push(`[Embed Description]: ${embed.description}`);
      if (embed.fields && embed.fields.length > 0) {
        for (const f of embed.fields) {
          lines.push(`${f.name}: ${f.value}`);
        }
      }
      if (embed.footer?.text) lines.push(`[Footer]: ${embed.footer.text}`);
    }
  }

  if (msg.attachments && msg.attachments.size > 0) {
    msg.attachments.forEach(a => {
      lines.push(`[Attachment]: ${a.url}`);
    });
  }

  lines.push(`[Author]: ${msg.author.username} (${msg.author.id})`);
  lines.push(`[Channel]: ${('name' in msg.channel ? (msg.channel as any).name : msg.channelId)}`);
  lines.push(`[Timestamp]: ${new Date(msg.createdTimestamp).toISOString()}`);

  return lines.join('\n');
}

// Store raw discord message and invoke Gemini processing
async function processAndStoreDiscordMessage(msg: Message) {
  try {
    // Check duplicate
    const existing = await queryOne('SELECT id FROM discord_logs WHERE message_id = ?', [msg.id]);
    if (existing) return;

    const channelName = 'name' in msg.channel ? (msg.channel as any).name : '';
    const cleanText = formatMessageToCleanText(msg);

    // Call Gemini Parser with retry
    let parsed: any = null;
    try {
      parsed = await parseDiscordLog(cleanText);
      if (!parsed || !parsed.success) {
        // Retry once
        parsed = await parseDiscordLog(cleanText);
      }
    } catch (err) {
      console.error('Gemini parser error:', err);
    }

    const logType = parsed?.record_type || 'general';

    // Store in discord_logs
    await query(
      `INSERT INTO discord_logs (message_id, channel_id, discord_id, type, raw_json, created_at)
       VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
       ON CONFLICT(message_id) DO NOTHING`,
      [msg.id, msg.channelId, msg.author.id, logType, JSON.stringify(parsed || { raw: cleanText })]
    );

    if (!parsed || !parsed.success) return;

    // Route to appropriate DB table based on parsed record_type
    if (parsed.record_type === 'case') {
      const caseNumber = parsed.case_number || `CASE-${Date.now().toString().slice(-6)}`;
      let imageUrl = parsed.image || '';
      if (!imageUrl && msg.attachments.size > 0) {
        const att = msg.attachments.first();
        if (att && att.contentType?.startsWith('image/')) {
          try { imageUrl = await downloadAttachment(att.url, att.name); } catch (_) {}
        }
      }

      const caseType = parsed.case_type || 'คดีปกติ';

      // 1. Extract officer Discord ID using required regex: /👮\s*คนลงคดี[\s\S]*?<@!?(\d+)>/
      let officerDiscordId = '';
      const officerMatch = cleanText.match(/👮\s*คนลงคดี[\s\S]*?<@!?(\d+)>/);
      if (officerMatch && officerMatch[1]) {
        officerDiscordId = officerMatch[1];
      } else {
        const altMatch = cleanText.match(/(?:คนลงคดี|ผู้ลงคดี|เจ้าหน้าที่|officer)[\s\S]*?<@!?(\d+)>/i);
        if (altMatch && altMatch[1]) {
          officerDiscordId = altMatch[1];
        }
      }

      // 2. Extract helper Discord IDs using required regex: /<@!?(\d+)>/g inside "ผู้ช่วย" section
      let helperSection = '';
      const helperMatch = cleanText.match(/(?:🛠\s*)?ผู้ช่วย[\s\S]*/i);
      if (helperMatch) {
        helperSection = helperMatch[0].split(/\n[🕒📁📋⏰]/)[0];
      }
      const helperDiscordIds: string[] = [];
      const helperRegex = /<@!?(\d+)>/g;
      let hm;
      while ((hm = helperRegex.exec(helperSection)) !== null) {
        const hId = hm[1];
        if (hId && hId !== officerDiscordId && !helperDiscordIds.includes(hId)) {
          helperDiscordIds.push(hId);
        }
      }

      const assistantText = helperDiscordIds.join(', ') || (Array.isArray(parsed.assistant) ? parsed.assistant.join(', ') : (parsed.assistant || 'ไม่มี'));

      await query(
        `INSERT INTO cases (case_number, title, case_type, description, suspect_name, officer_in_charge, assistant_officer, officer_discord_id, helpers, status, discord_message_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(case_number) DO UPDATE SET title = excluded.title, case_type = excluded.case_type, description = excluded.description, officer_in_charge = excluded.officer_in_charge, assistant_officer = excluded.assistant_officer, officer_discord_id = excluded.officer_discord_id, helpers = excluded.helpers, status = excluded.status, discord_message_id = excluded.discord_message_id`,
        [
          caseNumber,
          parsed.case_title || caseType,
          caseType,
          parsed.description || cleanText,
          Array.isArray(parsed.suspects) && parsed.suspects.length > 0 ? parsed.suspects.join(', ') : 'Unknown',
          parsed.officer || officerDiscordId || 'ไม่ระบุ',
          assistantText,
          officerDiscordId,
          JSON.stringify(helperDiscordIds),
          parsed.status === 'ปิดคดี' ? 'closed' : 'open',
          msg.id
        ]
      );
      try { await DutyValidationService.validateCaseByNumber(caseNumber); } catch (_) {}
      realtimeService.broadcast('CASE_CREATED', { case_number: caseNumber });
    } else if (parsed.record_type === 'duty') {
      const user = await queryOne('SELECT * FROM users WHERE discord_id = ? OR fullname LIKE ?', [msg.author.id, `%${parsed.officer || ''}%`]);
      if (user) {
        const todayStr = new Date(msg.createdTimestamp).toISOString().split('T')[0];
        const timeStr = new Date(msg.createdTimestamp).toTimeString().split(' ')[0].substring(0, 5);
        const isEnd = /out|off|ออกเวร|จบ/i.test(cleanText);

        if (isEnd) {
          const openLog = await queryOne('SELECT * FROM duty_logs WHERE user_id = ? AND (end_time = "" OR end_time IS NULL) ORDER BY id DESC LIMIT 1', [user.id]);
          if (openLog) {
            const parts = (openLog.start_time || '00:00').split(':').map(Number);
            const [endH, endM] = timeStr.split(':').map(Number);
            let diff = (endH + endM / 60) - (parts[0] + parts[1] / 60);
            if (diff < 0) diff += 24;
            await query('UPDATE duty_logs SET end_time = ?, hours = ? WHERE id = ?', [timeStr, parseFloat(diff.toFixed(2)), openLog.id]);
          }
        } else {
          await query('INSERT INTO duty_logs (user_id, date, start_time, end_time, hours) VALUES (?, ?, ?, ?, ?)', [user.id, todayStr, timeStr, '', 0]);
        }
        try { await DutyValidationService.revalidateOfficerCasesByUserId(user.id); } catch (_) {}
        realtimeService.broadcast('DUTY_LOGGED', { user_id: user.id });
      }
    } else if (parsed.record_type === 'evidence') {
      await query(
        'INSERT INTO evidence (case_number, title, description, items, image, officer_name) VALUES (?, ?, ?, ?, ?, ?)',
        [
          parsed.case_number || '',
          parsed.case_title || 'Captured Evidence',
          parsed.description || cleanText,
          Array.isArray(parsed.evidence) ? parsed.evidence.join(', ') : '',
          parsed.image || '',
          parsed.officer || msg.author.username
        ]
      );
      realtimeService.broadcast('EVIDENCE_UPDATED', { type: 'create' });
    } else if (parsed.record_type === 'wanted') {
      await query(
        'INSERT INTO wanted (suspect_name, charges, reward, status, officer_in_charge, image) VALUES (?, ?, ?, ?, ?, ?)',
        [
          Array.isArray(parsed.suspects) && parsed.suspects.length > 0 ? parsed.suspects.join(', ') : 'Unknown Suspect',
          parsed.description || parsed.case_title || 'Wanted Notice',
          parsed.fine || 0,
          'active',
          parsed.officer || msg.author.username,
          parsed.image || ''
        ]
      );
      realtimeService.broadcast('WANTED_UPDATED', { type: 'create' });
    } else if (parsed.record_type === 'announcement') {
      await query('INSERT INTO announcements (title, message, type) VALUES (?, ?, ?)', [
        parsed.case_title || 'Discord Announcement',
        parsed.description || cleanText,
        'announcement'
      ]);
      realtimeService.broadcast('ANNOUNCEMENT_CREATED', {});
    }
  } catch (err) {
    console.error('Error processing discord message:', err);
  }
}

// Sync missing messages across all monitored channels
async function syncMissingMessages() {
  console.log('🔄 Police Sync Bot: Synchronizing monitored channels...');
  const isSnowflake = (id: string) => /^\d{17,20}$/.test((id || '').trim());
  const channelIds = [DUTY_CHANNEL_ID, CASE_CHANNEL_ID, ANNOUNCEMENT_CHANNEL_ID, SYSTEM_CHANNEL_ID]
    .map(id => (id || '').trim())
    .filter(id => isSnowflake(id));

  for (const channelId of channelIds) {
    try {
      const channel = await client.channels.fetch(channelId);
      if (!channel || !channel.isTextBased()) continue;

      const lastLog = await queryOne(
        'SELECT message_id FROM discord_logs WHERE channel_id = ? ORDER BY id DESC LIMIT 1',
        [channelId]
      );

      const options: { limit: number; after?: string } = { limit: 50 };
      if (lastLog?.message_id) options.after = lastLog.message_id;

      const messages = await channel.messages.fetch(options);
      const sorted = Array.from(messages.values()).sort((a, b) => a.createdTimestamp - b.createdTimestamp);

      for (const msg of sorted) {
        if (msg.author.bot && msg.author.id === client.user?.id) continue;
        await processAndStoreDiscordMessage(msg);
      }
    } catch (err: any) {
      if (err?.code === 10003 || err?.rawError?.code === 10003) {
        console.warn(`[Police Sync Bot] Channel ${channelId} not found on Discord (Unknown Channel). Skipping.`);
      } else {
        console.error(`Failed to sync channel ${channelId}:`, err?.message || err);
      }
    }
  }
  console.log('✅ Police Sync Bot: Synchronization complete.');
}

// Event Handlers & Reconnect Logic
client.on('ready', async () => {
  console.log(`🚔 Police Sync Bot Logged in as ${client.user?.tag}`);
  await syncMissingMessages();
});

client.on('messageCreate', async (msg) => {
  if (msg.author.bot && msg.author.id === client.user?.id) return;
  await processAndStoreDiscordMessage(msg);
});

client.on('error', (err) => {
  console.error('Discord client error:', err);
});

client.on('shardDisconnect', (event) => {
  console.warn('Discord bot disconnected, attempt auto-reconnect...', event);
});

if (BOT_TOKEN) {
  client.login(BOT_TOKEN).catch(err => {
    console.error('Discord bot login failed:', err.message);
  });
} else {
  console.warn('⚠️ DISCORD_BOT_TOKEN is not defined in .env. Bot standing by.');
}

export default client;
