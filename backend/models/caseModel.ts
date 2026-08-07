import { query, queryOne } from '../database/db';
import { alertModel } from './alertModel';

export interface CaseRow {
  id: number;
  case_number: string;
  title: string;
  case_type?: string;
  description: string;
  suspect_name: string;
  officer_in_charge: string;
  assistant_officer?: string;
  officer_discord_id?: string;
  status: 'open' | 'closed' | 'pending';
  created_at?: string;
  has_alert?: boolean;
  alert_type?: string | null;
  alert_message?: string | null;
  alert_status?: string | null;
}

export const caseModel = {
  async getAll(): Promise<CaseRow[]> {
    const cases = await query('SELECT * FROM cases ORDER BY id DESC');
    const caseIds = cases.map((c: any) => c.id);
    if (caseIds.length > 0) {
      const alertMap = await alertModel.getAlertsByCaseIds(caseIds);
      return cases.map((c: any) => {
        const alertRow = alertMap[c.id];
        return {
          ...c,
          has_alert: alertRow ? alertRow.status === 'PENDING' : false,
          alert_type: alertRow ? alertRow.alert_type : null,
          alert_message: alertRow ? alertRow.message : null,
          alert_status: alertRow ? alertRow.status : null,
        };
      });
    }
    return cases;
  },

  async getCount(): Promise<number> {
    const res = await queryOne('SELECT COUNT(*) as count FROM cases');
    return res ? res.count : 0;
  },

  async findById(id: number): Promise<CaseRow | null> {
    return await queryOne('SELECT * FROM cases WHERE id = ?', [id]);
  },

  async create(data: { case_number: string; title: string; case_type?: string; description: string; suspect_name: string; officer_in_charge: string; assistant_officer?: string; officer_discord_id?: string; status: string }): Promise<number> {
    const result = await query(
      'INSERT INTO cases (case_number, title, case_type, description, suspect_name, officer_in_charge, assistant_officer, officer_discord_id, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [
        data.case_number,
        data.title,
        data.case_type || 'คดีปกติ',
        data.description,
        data.suspect_name,
        data.officer_in_charge,
        data.assistant_officer || 'ไม่มี',
        data.officer_discord_id || '',
        data.status
      ]
    );
    return result.insertId;
  },

  async update(id: number, data: { case_number?: string; title?: string; case_type?: string; description?: string; suspect_name?: string; officer_in_charge?: string; assistant_officer?: string; officer_discord_id?: string; status?: string }): Promise<boolean> {
    const existing = await this.findById(id);
    if (!existing) return false;

    const result = await query(
      'UPDATE cases SET case_number = ?, title = ?, case_type = ?, description = ?, suspect_name = ?, officer_in_charge = ?, assistant_officer = ?, officer_discord_id = ?, status = ? WHERE id = ?',
      [
        data.case_number ?? existing.case_number,
        data.title ?? existing.title,
        data.case_type ?? existing.case_type ?? 'คดีปกติ',
        data.description ?? existing.description,
        data.suspect_name ?? existing.suspect_name,
        data.officer_in_charge ?? existing.officer_in_charge,
        data.assistant_officer ?? existing.assistant_officer ?? 'ไม่มี',
        data.officer_discord_id ?? existing.officer_discord_id ?? '',
        data.status ?? existing.status,
        id
      ]
    );
    return result.affectedRows > 0;
  },

  async delete(id: number): Promise<boolean> {
    const result = await query('DELETE FROM cases WHERE id = ?', [id]);
    return result.affectedRows > 0;
  }
};
