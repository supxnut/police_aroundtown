import { query } from '../database/db';

export interface AnnouncementRow {
  id: number;
  title: string;
  message: string;
  type: 'announcement' | 'activity' | 'system';
  created_at?: string;
}

export const notificationModel = {
  async getAll(): Promise<AnnouncementRow[]> {
    return await query('SELECT * FROM announcements ORDER BY id DESC');
  },

  async create(title: string, message: string, type: 'announcement' | 'activity' | 'system' = 'announcement'): Promise<number> {
    const result = await query(
      'INSERT INTO announcements (title, message, type) VALUES (?, ?, ?)',
      [title, message, type]
    );
    return result.insertId;
  }
};
