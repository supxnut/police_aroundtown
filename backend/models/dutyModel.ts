import { query, queryOne } from '../database/db';

export interface DutyLogRow {
  id: number;
  user_id: number;
  date: string;
  start_time: string;
  end_time: string;
  hours: number;
  created_at?: string;
  fullname?: string;
  rank?: string;
  discord_id?: string;
}

export const dutyModel = {
  async getByUserId(userId: number): Promise<DutyLogRow[]> {
    return await query('SELECT * FROM duty_logs WHERE user_id = ? ORDER BY date DESC, id DESC', [userId]);
  },

  async getTotalHoursByUserId(userId: number): Promise<number> {
    const result = await queryOne('SELECT SUM(hours) as total FROM duty_logs WHERE user_id = ?', [userId]);
    return result && result.total ? parseFloat(result.total) : 0;
  },

  async getAll(): Promise<DutyLogRow[]> {
    return await query(`
      SELECT d.*, u.fullname, u.rank, u.discord_id 
      FROM duty_logs d 
      JOIN users u ON d.user_id = u.id 
      ORDER BY d.date DESC, d.id DESC
    `);
  },

  async getSummaryStats(): Promise<{ todayHours: number; weekHours: number; monthHours: number; totalHours: number }> {
    const todayStr = new Date().toISOString().split('T')[0];
    const now = new Date();
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    const startOfWeek = new Date(now.setDate(diff));
    startOfWeek.setHours(0, 0, 0, 0);
    const startOfWeekStr = startOfWeek.toISOString().split('T')[0];

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfMonthStr = startOfMonth.toISOString().split('T')[0];

    const res = await queryOne(`
      SELECT 
        SUM(CASE WHEN date = ? OR DATE(date) = ? THEN hours ELSE 0 END) as todayHours,
        SUM(CASE WHEN date >= ? OR DATE(date) >= ? THEN hours ELSE 0 END) as weekHours,
        SUM(CASE WHEN date >= ? OR DATE(date) >= ? THEN hours ELSE 0 END) as monthHours,
        SUM(hours) as totalHours
      FROM duty_logs
    `, [todayStr, todayStr, startOfWeekStr, startOfWeekStr, startOfMonthStr, startOfMonthStr]);

    return {
      todayHours: res && res.todayHours ? Math.round(parseFloat(res.todayHours) * 10) / 10 : 0,
      weekHours: res && res.weekHours ? Math.round(parseFloat(res.weekHours) * 10) / 10 : 0,
      monthHours: res && res.monthHours ? Math.round(parseFloat(res.monthHours) * 10) / 10 : 0,
      totalHours: res && res.totalHours ? Math.round(parseFloat(res.totalHours) * 10) / 10 : 0,
    };
  },

  async create(data: { user_id: number; date: string; start_time: string; end_time: string; hours: number }): Promise<number> {
    const result = await query(
      'INSERT INTO duty_logs (user_id, date, start_time, end_time, hours) VALUES (?, ?, ?, ?, ?)',
      [data.user_id, data.date, data.start_time, data.end_time, data.hours]
    );
    return result.insertId;
  },

  async update(id: number, data: { date: string; start_time: string; end_time: string; hours: number }): Promise<boolean> {
    const result = await query(
      'UPDATE duty_logs SET date = ?, start_time = ?, end_time = ?, hours = ? WHERE id = ?',
      [data.date, data.start_time, data.end_time, data.hours, id]
    );
    return result.affectedRows > 0;
  },

  async delete(id: number): Promise<boolean> {
    const result = await query('DELETE FROM duty_logs WHERE id = ?', [id]);
    return result.affectedRows > 0;
  }
};
