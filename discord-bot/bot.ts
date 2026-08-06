import { Client, GatewayIntentBits, Partials, Message, Embed, Attachment } from 'discord.js';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import https from 'https';
import { query, queryOne } from '../backend/database/db.js';
import { DutyValidationService } from '../backend/services/dutyValidationService.js';

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

// Helper: Download attachment images to uploads/cases/
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

// Helper: Extract Discord ID from mention or regex
function extractDiscordId(text: string, authorId: string): string {
  const mentionMatch = text.match(/<@!?(\d{17,20})>/);
  if (mentionMatch) return mentionMatch[1];

  const idMatch = text.match(/\b\d{17,20}\b/);
  if (idMatch) return idMatch[0];

  return authorId;
}

// Helper: Parse Duty message
async function parseAndStoreDutyLog(msg: Message) {
  const text = msg.content + ' ' + (msg.embeds.map(e => `${e.title || ''} ${e.description || ''} ${e.fields.map(f => `${f.name}: ${f.value}`).join(' ')}`).join(' '));
  const discordId = extractDiscordId(text, msg.author.id);
  const user = await queryOne('SELECT * FROM users WHERE discord_id = ?', [discordId]);

  if (!user) return;

  const isEndDuty = /clock\s*out|off\s*duty|ออกเวร|จบเวร|สิ้นสุด/i.test(text);
  const isStartDuty = /clock\s*in|on\s*duty|เข้าเวร|เริ่มเวร/i.test(text);

  const todayStr = new Date(msg.createdTimestamp).toISOString().split('T')[0];
  const timeStr = new Date(msg.createdTimestamp).toTimeString().split(' ')[0].substring(0, 5);

  if (isEndDuty) {
    const openLog = await queryOne(
      'SELECT * FROM duty_logs WHERE user_id = ? AND (end_time = "" OR end_time IS NULL) ORDER BY id DESC LIMIT 1',
      [user.id]
    );

    if (openLog) {
      const parts = (openLog.start_time || '00:00').split(':').map(Number);
      const startH = isNaN(parts[0]) ? 0 : parts[0];
      const startM = isNaN(parts[1]) ? 0 : parts[1];
      const [endH, endM] = timeStr.split(':').map(Number);
      let diffHours = (endH + endM / 60) - (startH + startM / 60);
      if (diffHours < 0) diffHours += 24;

      await query(
        'UPDATE duty_logs SET end_time = ?, hours = ? WHERE id = ?',
        [timeStr, parseFloat(diffHours.toFixed(2)), openLog.id]
      );
    }
  } else if (isStartDuty) {
    // Check if user already has an open log to prevent duplicate open logs
    const openLog = await queryOne(
      'SELECT * FROM duty_logs WHERE user_id = ? AND (end_time = "" OR end_time IS NULL) ORDER BY id DESC LIMIT 1',
      [user.id]
    );
    if (!openLog) {
      await query(
        'INSERT INTO duty_logs (user_id, date, start_time, end_time, hours) VALUES (?, ?, ?, ?, ?)',
        [user.id, todayStr, timeStr, '', 0]
      );
    }
  }

  // Revalidate officer cases after duty status update
  try {
    await DutyValidationService.revalidateOfficerCasesByUserId(user.id);
  } catch (err) {
    console.error('Duty validation recheck error:', err);
  }
}

// Helper: Parse Case message
async function parseAndStoreCaseLog(msg: Message) {
  let content = msg.content;
  let title = 'Police Case Record';
  let description = content;
  let suspectName = 'Unknown Suspect';
  let officerInCharge = msg.author.username;
  let caseNumber = `CASE-${Date.now().toString().slice(-6)}`;

  if (msg.embeds.length > 0) {
    const embed = msg.embeds[0];
    title = embed.title || title;
    description = embed.description || description;

    for (const field of embed.fields) {
      if (/suspect|ผู้ต้องหา|ผู้ต้องสงสัย/i.test(field.name)) suspectName = field.value;
      if (/officer|เจ้าหน้าที่|ผู้รับผิดชอบ/i.test(field.name)) officerInCharge = field.value;
      if (/case|คดี|หมายเลข/i.test(field.name)) caseNumber = field.value;
    }
  }

  const officerDiscordId = extractDiscordId(content + ' ' + (msg.embeds.map(e => `${e.title || ''} ${e.description || ''}`).join(' ')), msg.author.id);

  // Handle image attachments
  let imageUrl = '';
  if (msg.attachments.size > 0) {
    const attachment = msg.attachments.first();
    if (attachment && attachment.contentType?.startsWith('image/')) {
      try {
        imageUrl = await downloadAttachment(attachment.url, attachment.name);
      } catch (err) {
        console.error('Failed to download case attachment:', err);
      }
    }
  }

  // Save case into DB
  try {
    await query(
      `INSERT INTO cases (case_number, title, description, suspect_name, officer_in_charge, officer_discord_id, status)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(case_number) DO UPDATE SET title = excluded.title, description = excluded.description, officer_in_charge = excluded.officer_in_charge, officer_discord_id = excluded.officer_discord_id, status = excluded.status`,
      [caseNumber, title, `${description} ${imageUrl ? `\n[Attachment](${imageUrl})` : ''}`, suspectName, officerInCharge, officerDiscordId, 'open']
    );

    // Call Duty Validation Layer immediately after storing case log
    await DutyValidationService.validateCaseByNumber(caseNumber);
  } catch (e) {
    console.error('Case insert error:', e);
  }
}

// Store raw discord message event
async function storeDiscordLog(msg: Message, type: string) {
  try {
    const rawJson = JSON.stringify({
      id: msg.id,
      channelId: msg.channelId,
      author: {
        id: msg.author.id,
        username: msg.author.username,
      },
      content: msg.content,
      embeds: msg.embeds,
      attachments: msg.attachments.map(a => ({ url: a.url, name: a.name })),
      createdTimestamp: msg.createdTimestamp,
    });

    await query(
      `INSERT INTO discord_logs (message_id, channel_id, discord_id, type, raw_json, created_at)
       VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
       ON CONFLICT(message_id) DO NOTHING`,
      [msg.id, msg.channelId, msg.author.id, type, rawJson]
    );
  } catch (err) {
    console.error('Error logging discord raw message:', err);
  }
}

// Sync missing messages on startup
async function syncMissingMessages() {
  console.log('🔄 Police Sync Bot: Starting channels synchronization...');
  const channelIds = [DUTY_CHANNEL_ID, CASE_CHANNEL_ID, ANNOUNCEMENT_CHANNEL_ID, SYSTEM_CHANNEL_ID].filter(Boolean);

  for (const channelId of channelIds) {
    try {
      const channel = await client.channels.fetch(channelId);
      if (!channel || !channel.isTextBased()) continue;

      const lastLog = await queryOne(
        'SELECT message_id FROM discord_logs WHERE channel_id = ? ORDER BY id DESC LIMIT 1',
        [channelId]
      );

      const options: { limit: number; after?: string } = { limit: 100 };
      if (lastLog?.message_id) options.after = lastLog.message_id;

      const messages = await channel.messages.fetch(options);
      console.log(`📥 Channel ${channelId}: Fetched ${messages.size} missing messages.`);

      const sortedMessages = Array.from(messages.values()).sort((a, b) => a.createdTimestamp - b.createdTimestamp);

      for (const msg of sortedMessages) {
        if (msg.author.bot && msg.author.id === client.user?.id) continue;

        let type = 'system';
        if (channelId === DUTY_CHANNEL_ID) {
          type = 'duty';
          await parseAndStoreDutyLog(msg);
        } else if (channelId === CASE_CHANNEL_ID) {
          type = 'case';
          await parseAndStoreCaseLog(msg);
        } else if (channelId === ANNOUNCEMENT_CHANNEL_ID) {
          type = 'announcement';
          await query(
            'INSERT INTO announcements (title, message, type) VALUES (?, ?, ?)',
            [msg.embeds[0]?.title || 'Discord Announcement', msg.content || msg.embeds[0]?.description || '', 'announcement']
          );
        }

        await storeDiscordLog(msg, type);
      }
    } catch (err) {
      console.error(`Failed to sync channel ${channelId}:`, err);
    }
  }
  console.log('✅ Police Sync Bot: Synchronization complete.');
}

// Event Listeners
client.on('ready', async () => {
  console.log(`🚔 Police Sync Bot Logged in as ${client.user?.tag}`);
  await syncMissingMessages();
});

client.on('messageCreate', async (msg) => {
  if (msg.author.bot && msg.author.id === client.user?.id) return;

  let type = 'general';
  if (msg.channelId === DUTY_CHANNEL_ID) {
    type = 'duty';
    await parseAndStoreDutyLog(msg);
  } else if (msg.channelId === CASE_CHANNEL_ID) {
    type = 'case';
    await parseAndStoreCaseLog(msg);
  } else if (msg.channelId === ANNOUNCEMENT_CHANNEL_ID) {
    type = 'announcement';
    await query(
      'INSERT INTO announcements (title, message, type) VALUES (?, ?, ?)',
      [msg.embeds[0]?.title || 'Discord Announcement', msg.content || msg.embeds[0]?.description || '', 'announcement']
    );
  } else if (msg.channelId === SYSTEM_CHANNEL_ID) {
    type = 'system';
  }

  await storeDiscordLog(msg, type);
});

client.on('messageUpdate', async (oldMsg, newMsg) => {
  const msg = newMsg.partial ? await newMsg.fetch() : newMsg;
  await storeDiscordLog(msg as Message, 'message_update');
});

client.on('messageDelete', async (msg) => {
  if (msg.id) {
    await storeDiscordLog(msg as Message, 'message_delete');
  }
});

client.on('guildMemberUpdate', async (oldMember, newMember) => {
  try {
    const user = await queryOne('SELECT * FROM users WHERE discord_id = ?', [newMember.id]);
    if (user) {
      const topRole = newMember.roles.highest.name;
      await query('UPDATE users SET rank = ? WHERE discord_id = ?', [topRole, newMember.id]);
    }
  } catch (err) {
    console.error('guildMemberUpdate sync error:', err);
  }
});

client.on('guildMemberRemove', async (member) => {
  try {
    await query('UPDATE users SET active = 0 WHERE discord_id = ?', [member.id]);
  } catch (err) {
    console.error('guildMemberRemove sync error:', err);
  }
});

if (BOT_TOKEN) {
  client.login(BOT_TOKEN).catch(err => {
    console.error('Discord bot login failed:', err.message);
  });
} else {
  console.warn('⚠️ DISCORD_BOT_TOKEN is not defined in .env. Bot standing by.');
}

export default client;
