import { query, queryOne } from '../database/db';

export interface CaseAlertRow {
  id: number;
  officer_id: number | null;
  case_id: number;
  case_number: string;
  alert_type: 'NO_DUTY_LOG' | 'CASE_OUTSIDE_DUTY' | 'UNKNOWN_OFFICER';
  message: string;
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
  status: 'PENDING' | 'REVIEWED';
  duty_start_time: string;
  duty_end_time: string;
  case_time: string;
  reviewed_at?: string | null;
  reviewed_by?: string | null;
  created_at?: string;
  // Joined fields
  fullname?: string;
  rank?: string;
  discord_id?: string;
  avatar?: string;
  case_title?: string;
}

export const alertModel = {
  async getPendingCount(): Promise<number> {
    const res = await queryOne("SELECT COUNT(*) as cnt FROM case_alerts WHERE status = 'PENDING'");
    return res ? res.cnt : 0;
  },

  async getAll(options: { status?: string; page?: number; limit?: number }) {
    const page = Math.max(1, options.page || 1);
    const limit = Math.max(1, options.limit || 20);
    const offset = (page - 1) * limit;

    let whereClause = '';
    const params: any[] = [];

    if (options.status && options.status !== 'ALL') {
      whereClause = 'WHERE a.status = ?';
      params.push(options.status);
    }

    const countSql = `SELECT COUNT(*) as total FROM case_alerts a ${whereClause}`;
    const countRes = await queryOne(countSql, params);
    const total = countRes ? countRes.total : 0;

    const dataSql = `
      SELECT 
        a.*,
        COALESCE(u.fullname, c.officer_in_charge, 'ไม่ทราบชื่อ') as fullname,
        COALESCE(u.rank, c.officer_rank, 'Officer') as rank,
        COALESCE(u.discord_id, c.officer_discord_id, 'N/A') as discord_id,
        u.avatar,
        c.title as case_title
      FROM case_alerts a
      LEFT JOIN cases c ON a.case_id = c.id
      LEFT JOIN users u ON a.officer_id = u.id OR c.officer_in_charge = u.fullname OR c.officer_discord_id = u.discord_id
      ${whereClause}
      ORDER BY a.status ASC, a.id DESC
      LIMIT ? OFFSET ?
    `;

    const rows = await query(dataSql, [...params, limit, offset]);

    return {
      alerts: rows,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      }
    };
  },

  async getAlertsByCaseIds(caseIds: number[]): Promise<Record<number, CaseAlertRow>> {
    if (!caseIds || caseIds.length === 0) return {};
    const placeholders = caseIds.map(() => '?').join(',');
    const rows = await query(
      `SELECT * FROM case_alerts WHERE case_id IN (${placeholders}) AND status = 'PENDING'`,
      caseIds
    );
    const resultMap: Record<number, CaseAlertRow> = {};
    rows.forEach((r: CaseAlertRow) => {
      resultMap[r.case_id] = r;
    });
    return resultMap;
  },

  async markAsReviewed(id: number, reviewedBy: string): Promise<boolean> {
    const now = new Date().toISOString();
    const result = await query(
      `UPDATE case_alerts SET status = 'REVIEWED', reviewed_at = ?, reviewed_by = ? WHERE id = ?`,
      [now, reviewedBy, id]
    );
    return result.affectedRows > 0;
  },

  async deleteByCaseId(caseId: number): Promise<boolean> {
    const result = await query('DELETE FROM case_alerts WHERE case_id = ?', [caseId]);
    return result.affectedRows > 0;
  }
};
