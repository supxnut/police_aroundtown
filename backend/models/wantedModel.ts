import { query, queryOne } from '../database/db';

export interface WantedRow {
  id?: number;
  suspect_name: string;
  charges: string;
  reward?: number;
  status?: string;
  officer_in_charge?: string;
  image?: string;
  created_at?: string;
}

export const wantedModel = {
  async getAll(): Promise<WantedRow[]> {
    return await query('SELECT * FROM wanted ORDER BY id DESC');
  },

  async create(data: WantedRow): Promise<number> {
    const res = await query(
      'INSERT INTO wanted (suspect_name, charges, reward, status, officer_in_charge, image) VALUES (?, ?, ?, ?, ?, ?)',
      [
        data.suspect_name,
        data.charges,
        data.reward || 0,
        data.status || 'active',
        data.officer_in_charge || '',
        data.image || ''
      ]
    );
    return res.insertId;
  },

  async updateStatus(id: number, status: string): Promise<boolean> {
    const res = await query('UPDATE wanted SET status = ? WHERE id = ?', [status, id]);
    return res.affectedRows > 0;
  },

  async delete(id: number): Promise<boolean> {
    const res = await query('DELETE FROM wanted WHERE id = ?', [id]);
    return res.affectedRows > 0;
  }
};
