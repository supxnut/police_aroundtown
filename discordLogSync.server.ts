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
  const fullText = `${embed.title || ''} ${embed.description || ''} ${embed.fields?.map((f) => `${f.name} ${f.value}`).join(' ') || ''}`.toLowerCase();

  // Convert case type: คดีปกติ -> normal, Take2 -> take2, ส้มแดง -> red, จัดร้าน -> raid
  let caseType = 'normal';
  if (fullText.includes('take2') || fullText.includes('take 2')) {
    caseType = 'take2';
  } else if (fullText.includes('ส้มแดง') || fullText.includes('ส้ม-แดง') || fullText.includes('orange-red') || fullText.includes('red')) {
    caseType = 'red';
  } else if (fullText.includes('จัดร้าน') || fullText.includes('shop') || fullText.includes('raid')) {
    caseType = 'raid';
  } else {
    caseType = 'normal';
  }

  let caseId = `CASE-${msg.id}`;
  const caseIdMatch = fullText.match(/(?:case\s*#?|เลขเคส\s*[:#]?|รหัสเคส\s*[:#]?)\s*([a-za-z0-9-]+)/i);
  if (caseIdMatch && caseIdMatch[1]) {
    caseId = caseIdMatch[1].toUpperCase();
  }

  let officerFieldVal = '';
  let helperFieldVal = '';

  if (embed.fields) {
    for (const field of embed.fields) {
      const name = (field.name || '').toLowerCase();
      if (
        name.includes('👮') ||
        name.includes('คนลงคดี') ||
        name.includes('ผู้รับผิดชอบ') ||
        name.includes('เจ้าหน้าที่') ||
        name.includes('officer') ||
        name.includes('ผู้บันทึก') ||
        name.includes('ผู้ลง')
      ) {
        officerFieldVal += ' ' + field.value;
      }
      if (
        name.includes('🛠') ||
        name.includes('ผู้ช่วย') ||
        name.includes('ผู้ร่วม') ||
        name.includes('helper') ||
        name.includes('แท็ก')
      ) {
        helperFieldVal += ' ' + field.value;
      }
    }
  }

  // Extract Officer Discord ID from Field 👮 คนลงคดี (mention.user.id)
  let officerDiscordId = '';
  const officerMentionMatches = Array.from(officerFieldVal.matchAll(/\d{17,20}/g));
  if (officerMentionMatches.length > 0) {
    officerDiscordId = officerMentionMatches[0][0];
  } else {
    const mentionedUsers = Array.from(msg.mentions.users.values());
    if (mentionedUsers.length > 0) {
      officerDiscordId = mentionedUsers[0].id;
    } else if (msg.author) {
      officerDiscordId = msg.author.id;
    }
  }

  // Extract Helper Discord IDs from Field 🛠 ผู้ช่วย (mentions.users[])
  const helperDiscordIds: string[] = [];
  const helperMentionMatches = Array.from(helperFieldVal.matchAll(/\d{17,20}/g));
  for (const m of helperMentionMatches) {
    const hId = m[0];
    if (hId && hId !== officerDiscordId && !helperDiscordIds.includes(hId)) {
      helperDiscordIds.push(hId);
    }
  }

  for (const [id] of msg.mentions.users) {
    if (id !== officerDiscordId && !helperDiscordIds.includes(id)) {
      helperDiscordIds.push(id);
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

