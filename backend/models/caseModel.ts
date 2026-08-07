import { query, queryOne } from '../database/db';
import { alertModel } from './alertModel';

export interface HelperInfo {
  id?: string;
  name?: string;
  avatar?: string;
  discord_id?: string;
}

export interface CaseRow {
  id: number;
  case_number: string;
  caseId?: string;
  title: string;
  type?: string;
  case_type?: string;
  description: string;
  suspect_name: string;
  officer_in_charge: string;
  officerName?: string;
  officer_discord_id?: string;
  officerDiscordId?: string;
  officerId?: string;
  officer_avatar?: string;
  officerAvatar?: string;
  assistant_officer?: string;
  helpers?: HelperInfo[] | string[];
  image?: string;
  discord_message_id?: string;
  discordMessageId?: string;
  messageId?: string;
  guild_id?: string;
  guildId?: string;
  status: 'open' | 'closed' | 'pending';
  created_at?: string;
  createdAt?: string;
  updated_at?: string;
  updatedAt?: string;
  has_alert?: boolean;
  alert_type?: string | null;
  alert_message?: string | null;
  alert_status?: string | null;
}

export interface OfficerTypeStat {
  type: string;
  selfCount: number;
  helperCount: number;
  totalCount: number;
}

export interface OfficerStatsSummary {
  officerId: string;
  officerName: string;
  breakdown: OfficerTypeStat[];
  totalAllCases: number;
}

// Helper to format case row with standard camelCase and snake_case properties
function formatCaseRow(row: any): CaseRow {
  if (!row) return row;

  let parsedHelpers: HelperInfo[] = [];
  if (row.helpers) {
    if (typeof row.helpers === 'string') {
      try {
        parsedHelpers = JSON.parse(row.helpers);
      } catch (_) {
        parsedHelpers = row.helpers.split(',').map((h: string) => ({ name: h.trim() }));
      }
    } else if (Array.isArray(row.helpers)) {
      parsedHelpers = row.helpers;
    }
  }

  const caseIdVal = row.case_number || row.caseId || `CASE-${row.id}`;
  const caseTypeVal = row.case_type || row.type || row.caseType || 'คดีปกติ';
  const officerNameVal = row.officer_in_charge || row.officerName || 'ไม่ระบุ';
  const officerIdVal = row.officer_discord_id || row.officerDiscordId || row.officerId || '';
  const officerAvatarVal = row.officer_avatar || row.officerAvatar || '';
  const imageVal = row.image || '';
  const discordMsgIdVal = row.discord_message_id || row.discordMessageId || row.messageId || '';
  const guildIdVal = row.guild_id || row.guildId || '';
  const createdAtVal = row.created_at || row.createdAt || new Date().toISOString();

  return {
    ...row,
    id: row.id,
    case_number: caseIdVal,
    caseId: caseIdVal,
    title: row.title || caseTypeVal + ' ' + caseIdVal,
    type: caseTypeVal,
    case_type: caseTypeVal,
    description: row.description || '',
    suspect_name: row.suspect_name || 'ไม่ระบุ',
    officer_in_charge: officerNameVal,
    officerName: officerNameVal,
    officer_discord_id: officerIdVal,
    officerDiscordId: officerIdVal,
    officerId: officerIdVal,
    officer_avatar: officerAvatarVal,
    officerAvatar: officerAvatarVal,
    helpers: parsedHelpers,
    assistant_officer: row.assistant_officer || (parsedHelpers.map((h: any) => h.name || h.id || h).join(', ') || 'ไม่มี'),
    image: imageVal,
    discord_message_id: discordMsgIdVal,
    discordMessageId: discordMsgIdVal,
    messageId: discordMsgIdVal,
    guild_id: guildIdVal,
    guildId: guildIdVal,
    status: row.status || 'closed',
    created_at: createdAtVal,
    createdAt: createdAtVal,
    updated_at: row.updated_at || createdAtVal,
    updatedAt: row.updated_at || createdAtVal,
  };
}

export const caseModel = {
  async getAll(): Promise<CaseRow[]> {
    const cases = await query('SELECT * FROM cases ORDER BY created_at DESC, id DESC');
    const caseIds = cases.map((c: any) => c.id);
    const formatted = cases.map(formatCaseRow);

    if (caseIds.length > 0) {
      const alertMap = await alertModel.getAlertsByCaseIds(caseIds);
      return formatted.map((c: CaseRow) => {
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
    return formatted;
  },

  async getCount(): Promise<number> {
    const res = await queryOne('SELECT COUNT(*) as count FROM cases');
    return res ? Number(res.count) : 0;
  },

  async findById(id: number): Promise<CaseRow | null> {
    const row = await queryOne('SELECT * FROM cases WHERE id = ?', [id]);
    return row ? formatCaseRow(row) : null;
  },

  async findByCaseId(caseId: string): Promise<CaseRow | null> {
    const row = await queryOne('SELECT * FROM cases WHERE case_number = ? OR discord_message_id = ?', [caseId, caseId]);
    return row ? formatCaseRow(row) : null;
  },

  async createFromBot(data: {
    caseId?: string;
    case_number?: string;
    type?: string;
    case_type?: string;
    caseType?: string;
    officerId?: string;
    officerDiscordId?: string;
    officer_discord_id?: string;
    officerName?: string;
    officer_in_charge?: string;
    officerAvatar?: string;
    officer_avatar?: string;
    helpers?: any;
    description?: string;
    image?: string;
    discordMessageId?: string;
    discord_message_id?: string;
    messageId?: string;
    guildId?: string;
    guild_id?: string;
    createdAt?: string;
    created_at?: string;
  }): Promise<{ id: number; caseData: CaseRow }> {
    const caseIdVal = data.caseId || data.case_number || `CASE-${Date.now()}`;
    const caseTypeVal = data.type || data.case_type || data.caseType || 'คดีปกติ';
    const officerIdVal = data.officerDiscordId || data.officerId || data.officer_discord_id || '';
    const officerNameVal = data.officerName || data.officer_in_charge || 'ไม่ระบุ';
    const officerAvatarVal = data.officerAvatar || data.officer_avatar || '';
    const descriptionVal = data.description || '';
    const imageVal = data.image || '';
    const discordMsgIdVal = data.messageId || data.discordMessageId || data.discord_message_id || '';
    const guildIdVal = data.guildId || data.guild_id || '';
    const createdAtVal = data.createdAt || data.created_at || new Date().toISOString();

    // Process helpers array
    let helpersArr: any[] = [];
    if (Array.isArray(data.helpers)) {
      helpersArr = data.helpers;
    } else if (typeof data.helpers === 'string') {
      try {
        helpersArr = JSON.parse(data.helpers);
      } catch (_) {
        if (data.helpers.trim()) {
          helpersArr = data.helpers.split(',').map((h: string) => ({ name: h.trim() }));
        }
      }
    }

    const helpersJson = JSON.stringify(helpersArr);
    const assistantOfficerStr = helpersArr.map((h: any) => h.name || h.fullname || h.id || String(h)).join(', ') || 'ไม่มี';
    const titleVal = `${caseTypeVal} - ${caseIdVal}`;

    // Check if case already exists by discord_message_id or case_number
    let existing: any = null;
    if (discordMsgIdVal) {
      existing = await queryOne('SELECT * FROM cases WHERE discord_message_id = ?', [discordMsgIdVal]);
    }
    if (!existing && caseIdVal) {
      existing = await queryOne('SELECT * FROM cases WHERE case_number = ?', [caseIdVal]);
    }

    let insertId = 0;
    if (existing) {
      insertId = existing.id;
      await query(
        `UPDATE cases SET 
          case_type = ?, 
          officer_discord_id = ?, 
          officer_in_charge = ?, 
          officer_avatar = ?, 
          helpers = ?, 
          assistant_officer = ?, 
          description = ?, 
          image = ?, 
          guild_id = ?,
          discord_message_id = ?,
          created_at = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?`,
        [
          caseTypeVal,
          officerIdVal,
          officerNameVal,
          officerAvatarVal,
          helpersJson,
          assistantOfficerStr,
          descriptionVal,
          imageVal,
          guildIdVal,
          discordMsgIdVal,
          createdAtVal,
          insertId
        ]
      );
    } else {
      const result = await query(
        `INSERT INTO cases (
          case_number, title, case_type, description, suspect_name, 
          officer_in_charge, officer_discord_id, officer_avatar, assistant_officer, 
          helpers, image, guild_id, discord_message_id, status, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
        [
          caseIdVal,
          titleVal,
          caseTypeVal,
          descriptionVal,
          'ไม่ระบุ',
          officerNameVal,
          officerIdVal,
          officerAvatarVal,
          assistantOfficerStr,
          helpersJson,
          imageVal,
          guildIdVal,
          discordMsgIdVal,
          'closed',
          createdAtVal
        ]
      );
      insertId = result.insertId;
    }

    // Update officer total_cases in users table if user exists
    if (officerIdVal) {
      try {
        await query(
          `UPDATE users SET total_cases = (SELECT COUNT(*) FROM cases WHERE officer_discord_id = ? OR helpers LIKE ?) WHERE discord_id = ?`,
          [officerIdVal, `%${officerIdVal}%`, officerIdVal]
        );
      } catch (_) {}
    }

    const createdCase = await this.findById(insertId);
    return { id: insertId, caseData: createdCase! };
  },

  async create(data: {
    case_number: string;
    title: string;
    case_type?: string;
    description: string;
    suspect_name: string;
    officer_in_charge: string;
    assistant_officer?: string;
    officer_discord_id?: string;
    status: string;
  }): Promise<number> {
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

  async update(id: number, data: {
    case_number?: string;
    title?: string;
    case_type?: string;
    description?: string;
    suspect_name?: string;
    officer_in_charge?: string;
    assistant_officer?: string;
    officer_discord_id?: string;
    status?: string;
  }): Promise<boolean> {
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
  },

  // Calculate officer stats breakdown (ลงเอง / ถูกแท็ก / รวม) by case type and date filter
  async getOfficerStats(
    officerDiscordId: string,
    officerName?: string,
    dateFilter: 'all' | 'week' | 'month' | 'custom' = 'all',
    startDate?: string,
    endDate?: string
  ): Promise<OfficerStatsSummary> {
    const allCases = await this.getAll();

    // Date filtering logic
    const filteredCases = allCases.filter((c) => {
      if (dateFilter === 'all') return true;
      const dateStr = c.created_at || c.createdAt;
      if (!dateStr) return true;

      const t = new Date(dateStr).getTime();
      if (isNaN(t)) return true;

      const now = new Date();
      if (dateFilter === 'week') {
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay());
        startOfWeek.setHours(0, 0, 0, 0);

        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);
        endOfWeek.setHours(23, 59, 59, 999);

        return t >= startOfWeek.getTime() && t <= endOfWeek.getTime();
      }

      if (dateFilter === 'month') {
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
        return t >= startOfMonth.getTime() && t <= endOfMonth.getTime();
      }

      if (dateFilter === 'custom') {
        const start = startDate ? new Date(startDate).setHours(0, 0, 0, 0) : 0;
        const end = endDate ? new Date(endDate).setHours(23, 59, 59, 999) : Infinity;
        return t >= start && t <= end;
      }

      return true;
    });

    // Standard case types required by the prompt
    const defaultTypes = ['คดีปกติ', 'Take2', 'ส้มแดง', 'จัดร้าน'];
    const typeStatsMap: Record<string, { selfCount: number; helperCount: number }> = {};

    defaultTypes.forEach((t) => {
      typeStatsMap[t] = { selfCount: 0, helperCount: 0 };
    });

    const cleanOfficerId = (officerDiscordId || '').trim();
    const cleanOfficerName = (officerName || '').trim().toLowerCase();

    let totalAllCases = 0;

    filteredCases.forEach((c) => {
      const cType = c.case_type || c.type || 'คดีปกติ';
      if (!typeStatsMap[cType]) {
        typeStatsMap[cType] = { selfCount: 0, helperCount: 0 };
      }

      const isPrimary =
        (cleanOfficerId && c.officer_discord_id === cleanOfficerId) ||
        (cleanOfficerName && (c.officer_in_charge || '').toLowerCase().includes(cleanOfficerName));

      // Check if helper
      let isHelper = false;
      if (Array.isArray(c.helpers)) {
        isHelper = c.helpers.some((h: any) => {
          if (typeof h === 'string') {
            return (cleanOfficerId && h.includes(cleanOfficerId)) || (cleanOfficerName && h.toLowerCase().includes(cleanOfficerName));
          }
          if (typeof h === 'object' && h !== null) {
            return (
              (cleanOfficerId && (h.id === cleanOfficerId || h.discord_id === cleanOfficerId)) ||
              (cleanOfficerName && (h.name || '').toLowerCase().includes(cleanOfficerName))
            );
          }
          return false;
        });
      } else if (c.assistant_officer && cleanOfficerName) {
        isHelper = c.assistant_officer.toLowerCase().includes(cleanOfficerName);
      }

      if (isPrimary) {
        typeStatsMap[cType].selfCount += 1;
        totalAllCases += 1;
      } else if (isHelper) {
        typeStatsMap[cType].helperCount += 1;
        totalAllCases += 1;
      }
    });

    const breakdown: OfficerTypeStat[] = Object.keys(typeStatsMap).map((type) => {
      const stat = typeStatsMap[type];
      return {
        type,
        selfCount: stat.selfCount,
        helperCount: stat.helperCount,
        totalCount: stat.selfCount + stat.helperCount,
      };
    });

    return {
      officerId: officerDiscordId,
      officerName: officerName || officerDiscordId,
      breakdown,
      totalAllCases,
    };
  }
};
