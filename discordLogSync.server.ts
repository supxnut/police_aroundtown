import { Client, GatewayIntentBits, Partials, TextChannel } from 'discord.js';
import { query, queryOne } from './backend/database/db';

let isSyncing = false;
let lastSyncTimestamp = 0;

/**
 * Fetch all messages from Discord channel using REST API with pagination
 */
async function fetchAllDiscordChannelMessages(token: string, channelId: string): Promise<any[]> {
  const allMessages: any[] = [];
  let lastMessageId: string | undefined = undefined;

  for (let page = 0; page < 30; page++) { // Up to 3000 messages
    try {
      let url = `https://discord.com/api/v10/channels/${channelId}/messages?limit=100`;
      if (lastMessageId) {
        url += `&before=${lastMessageId}`;
      }

      const res = await fetch(url, {
        headers: {
          'Authorization': `Bot ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!res.ok) {
        break;
      }

      const messages = await res.json();
      if (!Array.isArray(messages) || messages.length === 0) {
        break;
      }

      allMessages.push(...messages);
      lastMessageId = messages[messages.length - 1].id;

      if (messages.length < 100) {
        break;
      }
    } catch (err: any) {
      console.error(`[Discord Sync] Error fetching page ${page}:`, err.message || err);
      break;
    }
  }

  return allMessages;
}

/**
 * Extract Case data from Discord Message and Embed
 */
export function parseCaseFromEmbed(msg: any, embed: any, guildId: string) {
  const fieldsText = (embed.fields || []).map((f: any) => `${f.name || ''}\n${f.value || ''}`).join('\n');
  const rawText = [
    msg.content || '',
    embed.title || '',
    embed.description || '',
    fieldsText,
  ].join('\n');

  const lowerText = rawText.toLowerCase();

  // 1. Case Type Determination
  let caseType = 'คดีปกติ';
  if (/take\s*2/i.test(lowerText) || lowerText.includes('take2')) {
    caseType = 'Take2';
  } else if (lowerText.includes('ส้มแดง') || lowerText.includes('ส้ม-แดง') || lowerText.includes('orange-red') || lowerText.includes('red')) {
    caseType = 'ส้มแดง';
  } else if (lowerText.includes('จัดร้าน') || lowerText.includes('shop') || lowerText.includes('raid')) {
    caseType = 'จัดร้าน';
  } else {
    caseType = 'คดีปกติ';
  }

  // 2. Case ID Determination
  let caseId = `CASE-${msg.id}`;
  const caseIdMatch = rawText.match(/(?:case\s*#?|เลขเคส\s*[:#]?|รหัสเคส\s*[:#]?)\s*([a-zA-Z0-9-]+)/i);
  if (caseIdMatch && caseIdMatch[1]) {
    caseId = caseIdMatch[1].toUpperCase();
  }

  // 3. Officer Discord ID Extraction (CRITICAL: NEVER use msg.author.id / Bot ID)
  let officerDiscordId = '';
  // Match regex: /👮\s*คนลงคดี[\s\S]*?<@!?(\d+)>/
  const officerRegex = /(?:👮\s*คนลงคดี|คนลงคดี|ผู้ลงคดี|เจ้าหน้าที่|officer)[\s\S]*?<@!?(\d{17,20})>/i;
  const officerMatch = rawText.match(officerRegex);
  if (officerMatch && officerMatch[1]) {
    officerDiscordId = officerMatch[1];
  } else {
    if (embed.fields) {
      for (const f of embed.fields) {
        const fname = (f.name || '').toLowerCase();
        if (fname.includes('คนลงคดี') || fname.includes('เจ้าหน้าที่') || fname.includes('officer')) {
          const m = (f.value || '').match(/<@!?(\d{17,20})>/) || (f.value || '').match(/(\d{17,20})/);
          if (m && m[1]) {
            officerDiscordId = m[1];
            break;
          }
        }
      }
    }
    if (!officerDiscordId) {
      const altMatch = rawText.match(/<@!?(\d{17,20})>/);
      if (altMatch && altMatch[1]) {
        officerDiscordId = altMatch[1];
      }
    }
  }

  // 4. Helper Discord IDs Extraction (Support UNLIMITED helpers)
  const helperDiscordIds: string[] = [];
  let helperSection = '';

  if (embed.fields) {
    for (const f of embed.fields) {
      const fname = (f.name || '').toLowerCase();
      if (fname.includes('ผู้ช่วย') || fname.includes('🛠') || fname.includes('helper')) {
        helperSection += '\n' + (f.value || '');
      }
    }
  }

  const helperSectionMatch = rawText.match(/(?:🛠\s*)?ผู้ช่วย[\s\S]*/i);
  if (helperSectionMatch) {
    helperSection += '\n' + helperSectionMatch[0].split(/\n[🕒📁📋⏰]/)[0];
  }

  const helperMentionRegex = /<@!?(\d{17,20})>/g;
  let hm;
  while ((hm = helperMentionRegex.exec(helperSection)) !== null) {
    const hId = hm[1];
    if (hId && hId !== officerDiscordId && !helperDiscordIds.includes(hId)) {
      helperDiscordIds.push(hId);
    }
  }

  // 5. Image Extraction (embed.image.url -> embed.thumbnail.url -> attachments)
  let image = '';
  if (embed.image && embed.image.url) {
    image = embed.image.url;
  } else if (embed.thumbnail && embed.thumbnail.url) {
    image = embed.thumbnail.url;
  } else if (msg.attachments && Array.isArray(msg.attachments) && msg.attachments.length > 0) {
    const att = msg.attachments[0];
    if (att && att.url && (att.content_type?.startsWith('image/') || /\.(jpg|jpeg|png|webp|gif)/i.test(att.url))) {
      image = att.url;
    }
  }

  const createdAt = embed.timestamp ? new Date(embed.timestamp).toISOString() : (msg.timestamp || msg.created_at || new Date().toISOString());
  const description = embed.description || embed.title || 'บันทึกเคสจาก Discord Log Channel';

  return {
    caseId,
    caseType,
    officerDiscordId,
    helperDiscordIds,
    image,
    description,
    guildId: guildId || msg.guild_id || '',
    messageId: msg.id,
    createdAt,
  };
}

/**
 * Primary Discord Log Synchronization Function.
 * REPLACES case collection to ensure Discord is the SINGLE SOURCE OF TRUTH.
 */
export async function syncDiscordCases(force: boolean = false): Promise<boolean> {
  if (isSyncing) return false;

  const now = Date.now();
  if (!force && now - lastSyncTimestamp < 3000) {
    return true;
  }

  const token = process.env.DISCORD_BOT_TOKEN;
  const channelId = process.env.DISCORD_CASE_LOG_CHANNEL_ID || process.env.DISCORD_CASE_CHANNEL_ID || '';

  if (!token || !channelId) {
    return false;
  }

  isSyncing = true;
  console.log('[Discord Sync] Started');

  try {
    console.log('[Discord Sync] Fetching Messages');
    const rawMessages = await fetchAllDiscordChannelMessages(token, channelId);

    console.log('[Discord Sync] Parsing Embeds');
    const validCases: any[] = [];

    for (const msg of rawMessages) {
      if (!msg.embeds || msg.embeds.length === 0) continue;
      for (const embed of msg.embeds) {
        try {
          const parsed = parseCaseFromEmbed(msg, embed, process.env.DISCORD_GUILD_ID || msg.guild_id || '');
          if (parsed) {
            validCases.push(parsed);
          }
        } catch (pErr: any) {
          console.warn(`[Discord Sync] Embed parsing failure for message ${msg.id}:`, pErr.message || pErr);
        }
      }
    }

    console.log('[Discord Sync] Updating Case Collection');

    // Upsert every valid case into cases table without deleting existing database records
    for (const c of validCases) {
      const helpersJson = JSON.stringify(c.helperDiscordIds.map((hId: string) => ({
        discord_id: hId,
        id: hId,
        name: hId
      })));

      const assistantOfficerStr = c.helperDiscordIds.join(', ') || 'ไม่มี';
      const titleVal = `${c.caseType} - ${c.caseId}`;

      const existing = await queryOne('SELECT id FROM cases WHERE discord_message_id = ?', [c.messageId]);

      if (existing) {
        await query(
          `UPDATE cases SET 
            case_number = ?,
            title = ?,
            case_type = ?, 
            officer_discord_id = ?, 
            helpers = ?, 
            assistant_officer = ?, 
            description = ?, 
            image = ?, 
            guild_id = ?,
            created_at = ?
          WHERE id = ?`,
          [
            c.caseId,
            titleVal,
            c.caseType,
            c.officerDiscordId,
            helpersJson,
            assistantOfficerStr,
            c.description,
            c.image,
            c.guildId,
            c.createdAt,
            existing.id
          ]
        );
      } else {
        await query(
          `INSERT INTO cases (
            case_number, title, case_type, description, suspect_name, 
            officer_in_charge, officer_discord_id, officer_avatar, assistant_officer, 
            helpers, image, guild_id, discord_message_id, status, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            c.caseId,
            titleVal,
            c.caseType,
            c.description,
            'ไม่ระบุ',
            'ไม่ระบุ',
            c.officerDiscordId,
            '',
            assistantOfficerStr,
            helpersJson,
            c.image,
            c.guildId,
            c.messageId,
            'closed',
            c.createdAt
          ]
        );
      }
    }

    console.log('[Discord Sync] Dashboard Updated');
    console.log('[Discord Sync] Personnel Updated');

    // Recalculate officer totals in users table dynamically
    try {
      const users = await query('SELECT id, discord_id FROM users');
      for (const u of users) {
        if (u.discord_id) {
          const res = await queryOne('SELECT COUNT(*) as cnt FROM cases WHERE officer_discord_id = ?', [u.discord_id]);
          const cnt = res ? Number(res.cnt) : 0;
          await query('UPDATE users SET total_cases = ? WHERE id = ?', [cnt, u.id]);
        }
      }
    } catch (_) {}

    lastSyncTimestamp = Date.now();
    console.log('[Discord Sync] Sync Complete');
    return true;
  } catch (err: any) {
    console.error('[Discord Sync] Sync Error:', err.message || err);
    return false;
  } finally {
    isSyncing = false;
  }
}

/**
 * Start Discord Log Sync Background Service
 */
export async function startDiscordLogSync() {
  const token = process.env.DISCORD_BOT_TOKEN;
  const channelId = process.env.DISCORD_CASE_LOG_CHANNEL_ID || process.env.DISCORD_CASE_CHANNEL_ID || '';

  if (!token) {
    console.log('[Discord Sync] DISCORD_BOT_TOKEN is not set. Sync service idle.');
    return;
  }

  // Initial Sync on Server Start
  await syncDiscordCases(true);

  // Schedule periodic background sync every 15 seconds
  setInterval(() => {
    syncDiscordCases().catch((err) => {
      console.error('[Discord Sync] Interval Sync Error:', err.message || err);
    });
  }, 15000);

  // Optional: Connect Discord.js Client for WebSocket events
  try {
    const client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
      ],
      partials: [Partials.Message, Partials.Channel, Partials.Reaction],
    });

    client.on('ready', () => {
      console.log('[Discord Sync] Discord Bot Client Connected');
    });

    client.on('messageCreate', (msg) => {
      if (msg.channelId === channelId) {
        syncDiscordCases(true).catch(() => {});
      }
    });

    client.on('messageDelete', (msg) => {
      if (msg.channelId === channelId) {
        syncDiscordCases(true).catch(() => {});
      }
    });

    client.on('messageUpdate', (oldMsg, newMsg) => {
      if (newMsg.channelId === channelId) {
        syncDiscordCases(true).catch(() => {});
      }
    });

    await client.login(token);
  } catch (err: any) {
    console.warn('[Discord Sync] Discord Client login warning:', err.message || err);
  }
}
