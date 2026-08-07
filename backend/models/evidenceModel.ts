import { query, queryOne } from '../database/db';

export interface EvidenceRow {
  id?: number;
  case_number?: string;
  title: string;
  description?: string;
  items?: string;
  image?: string;
  officer_name?: string;
  created_at?: string;
}

export const evidenceModel = {
  async getAll(): Promise<EvidenceRow[]> {
    return await query('SELECT * FROM evidence ORDER BY id DESC');
  },

  async create(data: EvidenceRow): Promise<number> {
    const res = await query(
      'INSERT INTO evidence (case_number, title, description, items, image, officer_name) VALUES (?, ?, ?, ?, ?, ?)',
      [
        data.case_number || '',
        data.title,
        data.description || '',
        data.items || '',
        data.image || '',
        data.officer_name || ''
      ]
    );
    return res.insertId;
  },

  async delete(id: number): Promise<boolean> {
    const res = await query('DELETE FROM evidence WHERE id = ?', [id]);
    return res.affectedRows > 0;
  }
};
