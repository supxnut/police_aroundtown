import axios from 'axios';

/**
 * Helper function for Discord Bot to send case data to the website API.
 * 
 * Usage in Discord Bot (e.g. inside case creation command or interaction):
 * 
 * sendCaseToWebsite({
 *   caseId: 'CASE-1001',
 *   type: 'คดีปกติ', // 'คดีปกติ' | 'Take2' | 'ส้มแดง' | 'จัดร้าน'
 *   officerId: '1517091307191930970', // Officer Discord ID
 *   officerName: 'John Doe',
 *   officerAvatar: 'https://cdn.discordapp.com/avatars/...',
 *   helpers: [
 *     { id: '1234567890', name: 'Officer Smith', avatar: 'https://...' },
 *     { id: '0987654321', name: 'Officer Davis', avatar: 'https://...' }
 *   ],
 *   description: 'ผู้ต้องหาฝ่าฝืนสัญญาณจราจรและต่อสู้ขัดขวางเจ้าพนักงาน',
 *   image: 'https://cdn.discordapp.com/attachments/...',
 *   discordMessageId: '987654321012345678',
 *   createdAt: new Date().toISOString()
 * });
 */

export interface CaseBotPayload {
  caseId: string;
  type?: 'คดีปกติ' | 'Take2' | 'ส้มแดง' | 'จัดร้าน' | string;
  caseType?: 'คดีปกติ' | 'Take2' | 'ส้มแดง' | 'จัดร้าน' | string;
  officerId?: string;
  officerDiscordId?: string;
  officerName: string;
  officerAvatar?: string;
  helpers?: Array<{
    id?: string;
    name?: string;
    avatar?: string;
    discord_id?: string;
  }>;
  description: string;
  image?: string;
  guildId?: string;
  messageId?: string;
  discordMessageId?: string;
  createdAt?: string;
}

export async function sendCaseToWebsite(payload: CaseBotPayload) {
  const websiteUrl = process.env.WEBSITE_URL || process.env.APP_URL || 'http://localhost:3000';
  const apiKey = process.env.API_KEY || process.env.BOT_API_KEY || 'my-secure-discord-bot-key-2026';

  try {
    const response = await axios.post(`${websiteUrl}/api/cases/sync`, payload, {
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
      },
      timeout: 10000,
    });

    console.log('[Discord Bot API] Case successfully posted to website:', response.data);
    return response.data;
  } catch (error: any) {
    console.error('[Discord Bot API] Failed to send case to website:', error.response?.data || error.message);
    throw error;
  }
}
