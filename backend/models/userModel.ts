import { query, queryOne } from '../database/db';

export interface UserRow {
  id: number;
  discord_id: string;
  fullname: string;
  rank: string;
  start_date: string;
  avatar: string;
  active: number;
  total_hours?: number;
  total_cases?: number;
  created_at?: string;
}

export const userModel = {
  async findByDiscordId(discordId: string): Promise<UserRow | null> {
    return await queryOne('SELECT * FROM users WHERE discord_id = ?', [discordId]);
  },

  async findById(id: number): Promise<UserRow | null> {
    return await queryOne('SELECT * FROM users WHERE id = ?', [id]);
  },

  async getAll(): Promise<UserRow[]> {
    return await query(`
      SELECT 
        u.*,
        COALESCE((
          SELECT SUM(dl.hours) FROM duty_logs dl WHERE dl.user_id = u.id
        ), 0) + COALESCE(u.total_hours, 0) AS total_hours,
        COALESCE((
          SELECT COUNT(*) FROM cases c 
          WHERE c.officer_discord_id = u.discord_id
             OR (c.officer_discord_id = '' AND LOWER(c.officer_in_charge) = LOWER(u.fullname))
        ), 0) AS total_cases
      FROM users u
      ORDER BY 
        CASE u.rank
          WHEN 'ผบ' THEN 1
          WHEN 'ครูฝึก' THEN 2
          WHEN 'สารวัตร' THEN 3
          WHEN 'หมวด' THEN 4
          WHEN 'จ่า' THEN 5
          WHEN 'นักเรียนตำรวจ' THEN 6
          ELSE 99
        END ASC,
        u.fullname ASC
    `);
  },

  async create(data: { discord_id: string; fullname: string; rank: string; start_date: string; avatar?: string; active?: number; total_hours?: number; total_cases?: number }): Promise<number> {
    const avatar = data.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150';
    const active = data.active ?? 1;
    const total_hours = data.total_hours ?? 0;
    const total_cases = data.total_cases ?? 0;
    const result = await query(
      'INSERT INTO users (discord_id, fullname, rank, start_date, avatar, active, total_hours, total_cases) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [data.discord_id, data.fullname, data.rank, data.start_date, avatar, active, total_hours, total_cases]
    );
    return result.insertId;
  },

  async update(id: number, data: { discord_id?: string; fullname?: string; rank?: string; start_date?: string; active?: number; avatar?: string; total_hours?: number; total_cases?: number }): Promise<boolean> {
    const user = await this.findById(id);
    if (!user) return false;

    const discord_id = data.discord_id ?? user.discord_id;
    const fullname = data.fullname ?? user.fullname;
    const rank = data.rank ?? user.rank;
    const start_date = data.start_date ?? user.start_date;
    const active = data.active ?? user.active;
    const avatar = data.avatar ?? user.avatar;
    const total_hours = data.total_hours !== undefined ? data.total_hours : (user.total_hours ?? 0);
    const total_cases = data.total_cases !== undefined ? data.total_cases : (user.total_cases ?? 0);

    const result = await query(
      'UPDATE users SET discord_id = ?, fullname = ?, rank = ?, start_date = ?, active = ?, avatar = ?, total_hours = ?, total_cases = ? WHERE id = ?',
      [discord_id, fullname, rank, start_date, active, avatar, total_hours, total_cases, id]
    );
    return result.affectedRows > 0;
  },

  async delete(id: number): Promise<boolean> {
    const result = await query('DELETE FROM users WHERE id = ?', [id]);
    return result.affectedRows > 0;
  },

  async countAll(): Promise<number> {
    const res = await queryOne('SELECT COUNT(*) as count FROM users');
    return res && res.count ? parseInt(res.count) : 0;
  }
};
