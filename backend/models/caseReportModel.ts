import { query, queryOne } from '../database/db';
import { alertModel } from './alertModel';

export interface CaseReportRow {
  id: number;
  date: string;
  time: string;
  case_number: string;
  title: string;
  case_type?: string;
  reporter_name: string;
  officer_in_charge: string;
  assistant_officer: string;
  discord_id: string;
  rank: string;
  status: 'open' | 'closed' | 'pending';
  received_time: string;
  closed_time: string;
  duration: string;
  created_at: string;
  has_alert?: boolean;
  alert_type?: string | null;
  alert_message?: string | null;
  alert_status?: string | null;
}

export interface CaseReportQueryOptions {
  range?: 'today' | 'week' | 'all';
  search?: string;
  page?: number;
  limit?: number;
}

export const caseReportModel = {
  async getReport(options: CaseReportQueryOptions = {}) {
    const range = options.range || 'all';
    const page = Math.max(1, Number(options.page) || 1);
    const limit = Math.max(1, Number(options.limit) || 10);
    const offset = (page - 1) * limit;
    const search = options.search || '';

    let whereClauses: string[] = [];
    let params: any[] = [];

    // Date Range Filtering
    if (range === 'today') {
      const todayStr = new Date().toISOString().split('T')[0];
      whereClauses.push("(DATE(c.created_at) = ? OR c.created_at LIKE ?)");
      params.push(todayStr, `${todayStr}%`);
    } else if (range === 'week') {
      const now = new Date();
      const day = now.getDay(); // 0 is Sunday
      const diff = now.getDate() - day; // Adjust to Sunday
      const startOfWeek = new Date(now.setDate(diff));
      startOfWeek.setHours(0, 0, 0, 0);
      const startOfWeekStr = startOfWeek.toISOString().split('T')[0];
      whereClauses.push("DATE(c.created_at) >= ?");
      params.push(startOfWeekStr);
    }

    // Search Query Filtering
    if (search.trim() !== '') {
      const s = `%${search.trim().toLowerCase()}%`;
      whereClauses.push("(LOWER(c.officer_in_charge) LIKE ? OR LOWER(COALESCE(c.assistant_officer, '')) LIKE ? OR LOWER(COALESCE(u.discord_id, c.officer_discord_id, '')) LIKE ? OR LOWER(c.case_number) LIKE ? OR LOWER(c.title) LIKE ?)");
      params.push(s, s, s, s, s);
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    // Count Total Query
    const countSql = `
      SELECT COUNT(*) as total
      FROM cases c
      LEFT JOIN users u ON c.officer_in_charge = u.fullname OR c.officer_discord_id = u.discord_id
      ${whereSql}
    `;
    const countRes = await queryOne(countSql, params);
    const total = countRes ? countRes.total : 0;

    // Paginated Data Query using Prepared Statements
    const dataSql = `
      SELECT 
        c.id,
        c.case_number,
        c.title,
        COALESCE(NULLIF(c.case_type, ''), 'คดีปกติ') as case_type,
        c.description,
        c.suspect_name,
        c.officer_in_charge,
        COALESCE(NULLIF(c.assistant_officer, ''), 'ไม่มี') as assistant_officer,
        c.status,
        c.created_at,
        COALESCE(NULLIF(c.reporter_name, ''), 'ไม่ระบุ') as reporter_name,
        COALESCE(NULLIF(u.discord_id, ''), NULLIF(c.officer_discord_id, ''), '100000000000000001') as discord_id,
        COALESCE(NULLIF(u.rank, ''), NULLIF(c.officer_rank, ''), 'Officer') as rank,
        COALESCE(NULLIF(c.received_time, ''), strftime('%H:%M', c.created_at), '08:00') as received_time,
        COALESCE(NULLIF(c.closed_time, ''), CASE WHEN c.status = 'closed' THEN '12:00' ELSE 'ยังไม่ปิดเคส' END) as closed_time,
        COALESCE(NULLIF(c.duration, ''), CASE WHEN c.status = 'closed' THEN '2 ชม. 30 นาที' ELSE 'กำลังดำเนินการ' END) as duration
      FROM cases c
      LEFT JOIN users u ON c.officer_in_charge = u.fullname OR c.officer_discord_id = u.discord_id
      ${whereSql}
      ORDER BY c.id DESC
      LIMIT ? OFFSET ?
    `;

    const queryParams = [...params, limit, offset];
    const rows = await query(dataSql, queryParams);

    // Calculate Dashboard Card Stats
    const todayStr = new Date().toISOString().split('T')[0];
    const now = new Date();
    const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));
    startOfWeek.setHours(0, 0, 0, 0);
    const startOfWeekStr = startOfWeek.toISOString().split('T')[0];

    const todayRes = await queryOne("SELECT COUNT(*) as cnt FROM cases WHERE DATE(created_at) = ? OR created_at LIKE ?", [todayStr, `${todayStr}%`]);
    const weekRes = await queryOne("SELECT COUNT(*) as cnt FROM cases WHERE DATE(created_at) >= ?", [startOfWeekStr]);
    const totalRes = await queryOne("SELECT COUNT(*) as cnt FROM cases");

    const caseIds = rows.map((r: any) => r.id);
    const alertMap = caseIds.length > 0 ? await alertModel.getAlertsByCaseIds(caseIds) : {};

    // Format output rows
    const cases = rows.map((r: any) => {
      const createdAt = r.created_at || new Date().toISOString();
      const datePart = createdAt.substring(0, 10);
      let timePart = r.received_time;
      if (createdAt.includes('T') || createdAt.includes(' ')) {
        const timeMatch = createdAt.match(/\d{2}:\d{2}/);
        if (timeMatch) timePart = timeMatch[0];
      }

      const alertRow = alertMap[r.id];

      return {
        id: r.id,
        date: datePart,
        time: timePart,
        case_number: r.case_number,
        title: r.title,
        case_type: r.case_type || 'คดีปกติ',
        reporter_name: r.reporter_name || 'ไม่ระบุ',
        officer_in_charge: r.officer_in_charge || 'ไม่ระบุ',
        assistant_officer: r.assistant_officer || 'ไม่มี',
        discord_id: r.discord_id || '100000000000000001',
        rank: r.rank || 'Officer',
        status: r.status || 'open',
        received_time: r.received_time || timePart || '08:00',
        closed_time: r.closed_time || (r.status === 'closed' ? '12:00' : 'ยังไม่ปิดเคส'),
        duration: r.duration || (r.status === 'closed' ? '2 ชม. 30 นาที' : 'กำลังดำเนินการ'),
        created_at: createdAt,
        has_alert: alertRow ? alertRow.status === 'PENDING' : false,
        alert_type: alertRow ? alertRow.alert_type : null,
        alert_message: alertRow ? alertRow.message : null,
        alert_status: alertRow ? alertRow.status : null,
      };
    });

    return {
      cases,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
      stats: {
        todayCount: todayRes ? todayRes.cnt : 0,
        weekCount: weekRes ? weekRes.cnt : 0,
        totalCount: totalRes ? totalRes.cnt : 0,
      }
    };
  }
};
