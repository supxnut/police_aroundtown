import { query } from '../database/db';

export interface LogRow {
  id: number;
  admin_discord_id: string;
  action: string;
  date: string;
  time: string;
  affected_user: string;
  created_at?: string;
}

export const logModel = {
  async createLog(data: { admin_discord_id: string; action: string; affected_user?: string }): Promise<number> {
    const now = new Date();
    const date = now.toISOString().split('T')[0];
    const time = now.toTimeString().split(' ')[0];
    const affectedUser = data.affected_user || 'N/A';

    const result = await query(
      'INSERT INTO logs (admin_discord_id, action, date, time, affected_user) VALUES (?, ?, ?, ?, ?)',
      [data.admin_discord_id, data.action, date, time, affectedUser]
    );
    return result.insertId;
  },

  async getAll(): Promise<LogRow[]> {
    return await query('SELECT * FROM logs ORDER BY id DESC');
  },

  async getDiscordLogs(): Promise<any[]> {
    return await query('SELECT * FROM discord_logs ORDER BY id DESC LIMIT 100');
  }
};
