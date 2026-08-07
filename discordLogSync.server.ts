import { Client, GatewayIntentBits, Partials, TextChannel, Message, Embed } from 'discord.js';
import { caseModel } from './backend/models/caseModel';
import { queryOne } from './backend/database/db';

export async function startDiscordLogSync() {
  const token = process.env.DISCORD_BOT_TOKEN;
  const guildId = process.env.DISCORD_GUILD_ID || '';
  const channelId = process.env.DISCORD_CASE_LOG_CHANNEL_ID || process.env.DISCORD_CASE_CHANNEL_ID || '';

  if (!token) {
    console.log('[Discord Sync] DISCORD_BOT_TOKEN is not set. Sync service idle.');
    return;
  }

  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
    ],
    partials: [Partials.Message, Partials.Channel, Partials.Reaction],
  });

  const isSnowflake = (id: string) => /^\d{17,20}$/.test((id || '').trim());

  client.on('ready', async () => {
    console.log('[Discord Sync] Discord Connected');

    let targetChannel: TextChannel | null = null;

    if (channelId && isSnowflake(channelId)) {
      try {
        const ch = await client.channels.fetch(channelId);
        if (ch && ch.isTextBased()) {
          targetChannel = ch as TextChannel;
          console.log('[Discord Sync] Channel Found');
        }
      } catch (err: any) {
        console.warn(`[Discord Sync] Target case log channel fetch failed (${err.message || err})`);
      }
    }

    if (!targetChannel) {
      console.warn('[Discord Sync] Target case log channel not found or channel ID missing.');
    }

    const syncMessages = async () => {
      if (!targetChannel) {
        if (channelId && isSnowflake(channelId)) {
          try {
            const ch = await client.channels.fetch(channelId);
            if (ch && ch.isTextBased()) {
              targetChannel = ch as TextChannel;
              console.log('[Discord Sync] Channel Found');
            }
          } catch (_) {}
        }
        if (!targetChannel) return;
      }

      try {
        const fetchedMessages = await targetChannel.messages.fetch({ limit: 50 });
        console.log('[Discord Sync] Messages Synced');

        let casesImported = 0;
        let casesUpdated = 0;

        for (const [, msg] of fetchedMessages) {
          // Process messages containing Embeds only
          if (!msg.embeds || msg.embeds.length === 0) continue;

          for (const embed of msg.embeds) {
            const parsed = parseCaseFromEmbed(msg, embed, guildId || msg.guildId || '');
            if (!parsed) continue;

            const existing = await queryOne('SELECT id FROM cases WHERE discord_message_id = ?', [msg.id]);

            await caseModel.createCase({
              caseId: parsed.caseId,
              caseType: parsed.caseType,
              officerDiscordId: parsed.officerDiscordId,
              officerUsername: parsed.officerDiscordId,
              helperDiscordIds: parsed.helperDiscordIds,
              helperUsernames: parsed.helperDiscordIds,
              image: parsed.image,
              description: parsed.description,
              guildId: parsed.guildId,
              messageId: msg.id,
              createdAt: parsed.createdAt,
            });

            if (existing) {
              casesUpdated++;
            } else {
              casesImported++;
            }
          }
        }

        console.log(`[Discord Sync] Cases Imported: ${casesImported}`);
        console.log(`[Discord Sync] Cases Updated: ${casesUpdated}`);
      } catch (error: any) {
        console.error(`[Discord Sync] Sync Error: ${error.message || error}`);
      }
    };

    // Run immediately on start
    await syncMessages();

    // Schedule every 15 seconds
    setInterval(syncMessages, 15000);
  });

  client.on('error', (error) => {
    console.error(`[Discord Sync] Sync Error: ${error.message || error}`);
  });

  try {
    await client.login(token);
  } catch (err: any) {
    console.error(`[Discord Sync] Sync Error: ${err.message || err}`);
  }
}

function parseCaseFromEmbed(msg: Message, embed: Embed, guildId: string) {
  const rawText = [
    msg.content || '',
    embed.title || '',
    embed.description || '',
    ...(embed.fields?.map((f) => `${f.name}\n${f.value}`) || []),
  ].join('\n');

  const lowerText = rawText.toLowerCase();

  // Convert case type: คดีปกติ -> normal, Take2 -> take2, ส้มแดง -> red, จัดร้าน -> raid
  let caseType = 'normal';
  if (lowerText.includes('take2') || lowerText.includes('take 2')) {
    caseType = 'take2';
  } else if (lowerText.includes('ส้มแดง') || lowerText.includes('ส้ม-แดง') || lowerText.includes('orange-red') || lowerText.includes('red')) {
    caseType = 'red';
  } else if (lowerText.includes('จัดร้าน') || lowerText.includes('shop') || lowerText.includes('raid')) {
    caseType = 'raid';
  } else {
    caseType = 'normal';
  }

  let caseId = `CASE-${msg.id}`;
  const caseIdMatch = rawText.match(/(?:case\s*#?|เลขเคส\s*[:#]?|รหัสเคส\s*[:#]?)\s*([a-zA-Z0-9-]+)/i);
  if (caseIdMatch && caseIdMatch[1]) {
    caseId = caseIdMatch[1].toUpperCase();
  }

  // 1. Extract officer Discord ID using required regex: /👮\s*คนลงคดี[\s\S]*?<@!?(\d+)>/
  let officerDiscordId = '';
  const officerRegex = /👮\s*คนลงคดี[\s\S]*?<@!?(\d+)>/;
  const officerMatch = rawText.match(officerRegex);
  if (officerMatch && officerMatch[1]) {
    officerDiscordId = officerMatch[1];
  } else {
    // Fallback search for mention after officer keywords (NEVER use message.id or author.id)
    const altOfficerMatch = rawText.match(/(?:คนลงคดี|ผู้ลงคดี|เจ้าหน้าที่|officer)[\s\S]*?<@!?(\d+)>/i);
    if (altOfficerMatch && altOfficerMatch[1]) {
      officerDiscordId = altOfficerMatch[1];
    }
  }

  // 2. Extract helper Discord IDs using required regex: /<@!?(\d+)>/g inside "ผู้ช่วย" section
  const helperDiscordIds: string[] = [];
  let helperSection = '';

  // Check embed fields first
  if (embed.fields) {
    for (const f of embed.fields) {
      if ((f.name || '').includes('ผู้ช่วย') || (f.name || '').includes('🛠') || (f.name || '').toLowerCase().includes('helper')) {
        helperSection += '\n' + f.value;
      }
    }
  }

  // Also search rawText for ผู้ช่วย section
  const helperSectionMatch = rawText.match(/(?:🛠\s*)?ผู้ช่วย[\s\S]*/i);
  if (helperSectionMatch) {
    helperSection += '\n' + helperSectionMatch[0].split(/\n[🕒📁📋⏰]/)[0];
  }

  const helperRegex = /<@!?(\d+)>/g;
  let hm;
  while ((hm = helperRegex.exec(helperSection)) !== null) {
    const hId = hm[1];
    if (hId && hId !== officerDiscordId && !helperDiscordIds.includes(hId)) {
      helperDiscordIds.push(hId);
    }
  }

  const image = embed.image?.url || embed.thumbnail?.url || msg.attachments.first()?.url || '';
  const createdAt = embed.timestamp ? new Date(embed.timestamp).toISOString() : msg.createdAt.toISOString();
  const description = embed.description || embed.title || 'บันทึกเคสจาก Discord Log Channel';

  return {
    caseId,
    caseType,
    officerDiscordId,
    helperDiscordIds,
    image,
    description,
    guildId,
    createdAt,
  };
}

