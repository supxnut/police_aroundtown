import { logModel } from '../models/logModel';

export const logAdminAction = async (adminDiscordId: string, action: string, affectedUser?: string) => {
  try {
    await logModel.createLog({
      admin_discord_id: adminDiscordId,
      action,
      affected_user: affectedUser || 'N/A',
    });
  } catch (error) {
    console.error('Failed to log admin action:', error);
  }
};
