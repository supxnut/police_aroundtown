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

async function getUserMap(): Promise<Map<string, { fullname: string; avatar: string }>> {
  const map = new Map<string, { fullname: string; avatar: string }>();
  try {
    const users = await query('SELECT discord_id, fullname, avatar FROM users');
    for (const u of users) {
      if (u.discord_id && u.discord_id.trim()) {
        map.set(u.discord_id.trim(), { fullname: u.fullname || '', avatar: u.avatar || '' });
      }
    }
  } catch (_) {}
  return map;
}

// Helper to format case row with standard camelCase and snake_case properties
function formatCaseRowWithUserMap(row: any, userMap?: Map<string, { fullname: string; avatar: string }>): CaseRow {
  if (!row) return row;

  let description = row.description || '';

  // 1. Extract officer Discord ID using required regex: /👮\s*คนลงคดี[\s\S]*?<@!?(\d+)>/
  let officerIdVal = row.officer_discord_id || row.officerDiscordId || row.officerId || '';
  const officerMatch = description.match(/👮\s*คนลงคดี[\s\S]*?<@!?(\d+)>/);
  if (officerMatch && officerMatch[1]) {
    officerIdVal = officerMatch[1];
  } else {
    // If officerIdVal is equal to message id or missing, check fallback regex
    if (!/^\d{17,20}$/.test(officerIdVal) || officerIdVal === row.discord_message_id) {
      const altMatch = description.match(/(?:คนลงคดี|ผู้ลงคดี|เจ้าหน้าที่|officer)[\s\S]*?<@!?(\d+)>/i);
      if (altMatch && altMatch[1]) {
        officerIdVal = altMatch[1];
      }
    }
  }

  // 2. Extract Helpers using required regex: /<@!?(\d+)>/g inside "ผู้ช่วย" section
  let helperSection = '';
  const helperSectionMatch = description.match(/(?:🛠\s*)?ผู้ช่วย[\s\S]*/i);
  if (helperSectionMatch) {
    helperSection = helperSectionMatch[0].split(/\n[🕒📁📋⏰]/)[0];
  }
  const helperIdsFromDesc: string[] = [];
  const helperRegex = /<@!?(\d+)>/g;
  let hm;
  while ((hm = helperRegex.exec(helperSection)) !== null) {
    const hId = hm[1];
    if (hId && hId !== officerIdVal && !helperIdsFromDesc.includes(hId)) {
      helperIdsFromDesc.push(hId);
    }
  }

  let parsedHelpers: HelperInfo[] = [];
  if (row.helpers) {
    if (typeof row.helpers === 'string') {
      try {
        const json = JSON.parse(row.helpers);
        if (Array.isArray(json)) {
          parsedHelpers = json.map((h: any) => {
            const rawId = typeof h === 'string' ? h : h.discord_id || h.id || h.name || '';
            const cleanId = (String(rawId).match(/\d{17,20}/) || [])[0] || String(rawId);
            return { discord_id: cleanId, id: cleanId, name: cleanId };
          });
        }
      } catch (_) {
        parsedHelpers = row.helpers.split(',').map((h: string) => {
          const rawId = h.trim();
          const cleanId = (rawId.match(/\d{17,20}/) || [])[0] || rawId;
          return { discord_id: cleanId, id: cleanId, name: cleanId };
        });
      }
    } else if (Array.isArray(row.helpers)) {
      parsedHelpers = row.helpers.map((h: any) => {
        const rawId = typeof h === 'string' ? h : h.discord_id || h.id || h.name || '';
        const cleanId = (String(rawId).match(/\d{17,20}/) || [])[0] || String(rawId);
        return { discord_id: cleanId, id: cleanId, name: cleanId };
      });
    }
  }

  if (parsedHelpers.length === 0 && helperIdsFromDesc.length > 0) {
    parsedHelpers = helperIdsFromDesc.map((hId) => ({ discord_id: hId, id: hId, name: hId }));
  }

  // Officer name & avatar resolution
  let officerNameVal = 'ไม่ระบุ';
  let officerAvatarVal = row.officer_avatar || row.officerAvatar || '';

  if (userMap && officerIdVal && userMap.has(officerIdVal)) {
    const user = userMap.get(officerIdVal)!;
    officerNameVal = user.fullname;
    officerAvatarVal = user.avatar || officerAvatarVal;
  } else if (row.officer_in_charge && !row.officer_in_charge.includes('<@') && !/^\d{17,20}$/.test(row.officer_in_charge) && row.officer_in_charge !== row.discord_message_id) {
    officerNameVal = row.officer_in_charge;
  } else if (officerIdVal) {
    officerNameVal = officerIdVal;
  }

  // Helpers resolution with userMap
  parsedHelpers = parsedHelpers.map((h) => {
    const rawId = h.discord_id || h.id || (typeof h.name === 'string' ? (h.name.match(/\d{17,20}/) || [])[0] : '');
    const cleanId = String(rawId || '').replace(/<@!?(\d+)>/g, '$1');
    if (userMap && cleanId && userMap.has(cleanId)) {
      const user = userMap.get(cleanId)!;
      return {
        ...h,
        discord_id: cleanId,
        id: cleanId,
        name: user.fullname,
        avatar: user.avatar,
      };
    }
    return {
      ...h,
      discord_id: cleanId,
      id: cleanId,
      name: cleanId || 'ไม่ระบุ',
    };
  });

  // 5. Clean Discord mention tags from description
  description = description.replace(/<@!?(\d+)>/g, '$1');

  const caseIdVal = row.case_number || row.caseId || `CASE-${row.id}`;
  const caseTypeVal = row.case_type || row.type || row.caseType || 'คดีปกติ';
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
    description,
    suspect_name: row.suspect_name || 'ไม่ระบุ',
    officer_in_charge: officerNameVal,
    officerName: officerNameVal,
    officer_discord_id: officerIdVal,
    officerDiscordId: officerIdVal,
    officerId: officerIdVal,
    officer_avatar: officerAvatarVal,
    officerAvatar: officerAvatarVal,
    helpers: parsedHelpers,
    assistant_officer: parsedHelpers.map((h: any) => h.name || h.discord_id || h.id).join(', ') || 'ไม่มี',
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

async function formatCaseRows(rows: any[]): Promise<CaseRow[]> {
  if (!rows || rows.length === 0) return [];
  const userMap = await getUserMap();
  return rows.map((r) => formatCaseRowWithUserMap(r, userMap));
}

function formatCaseRow(row: any): CaseRow {
  return formatCaseRowWithUserMap(row);
}

export const caseModel = {
  async getAll(): Promise<CaseRow[]> {
    const cases = await query('SELECT * FROM cases ORDER BY created_at DESC, id DESC');
    const caseIds = cases.map((c: any) => c.id);
    const formatted = await formatCaseRows(cases);

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
    if (!row) return null;
    const formatted = await formatCaseRows([row]);
    return formatted[0] || null;
  },

  async findByCaseId(caseId: string): Promise<CaseRow | null> {
    const row = await queryOne('SELECT * FROM cases WHERE case_number = ? OR discord_message_id = ?', [caseId, caseId]);
    if (!row) return null;
    const formatted = await formatCaseRows([row]);
    return formatted[0] || null;
  },

  async getByOfficerDiscordId(discordId: string): Promise<CaseRow[]> {
    const extractSnowflake = (str?: string) => {
      const match = (str || '').match(/\d{17,20}/);
      return match ? match[0] : '';
    };
    const targetSnowflake = extractSnowflake(discordId);
    if (!targetSnowflake) {
      return [];
    }

    const paramPattern = `%${targetSnowflake}%`;
    const cases = await query(
      `SELECT * FROM cases 
       WHERE officer_discord_id = ? 
          OR officer_discord_id LIKE ? 
          OR helpers LIKE ? 
          OR assistant_officer LIKE ? 
       ORDER BY created_at DESC, id DESC`,
      [targetSnowflake, paramPattern, paramPattern, paramPattern]
    );

    const formatted = await formatCaseRows(cases);

    const filtered = formatted.filter((c: CaseRow) => {
      const officerSf = extractSnowflake(c.officer_discord_id || c.officerDiscordId || c.officerId);
      if (officerSf && officerSf === targetSnowflake) return true;

      let helperText = '';
      if (typeof c.helpers === 'string') {
        helperText += ' ' + c.helpers;
      } else if (Array.isArray(c.helpers)) {
        helperText += ' ' + JSON.stringify(c.helpers);
      }
      if (c.assistant_officer) {
        helperText += ' ' + c.assistant_officer;
      }
      const helperSnowflakes = Array.from(helperText.matchAll(/\d{17,20}/g)).map((m) => m[0]);
      return helperSnowflakes.includes(targetSnowflake);
    });

    const caseIds = filtered.map((c: any) => c.id);
    if (caseIds.length > 0) {
      const alertMap = await alertModel.getAlertsByCaseIds(caseIds);
      return filtered.map((c: CaseRow) => {
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
    return filtered;
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
    officerUsername?: string;
    officerName?: string;
    officer_in_charge?: string;
    officerAvatar?: string;
    officer_avatar?: string;
    helpers?: any;
    helperDiscordIds?: string[];
    helperUsernames?: string[];
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
    const caseTypeVal = data.caseType || data.type || data.case_type || 'คดีปกติ';
    const officerIdVal = data.officerDiscordId || data.officerId || data.officer_discord_id || '';
    const officerNameVal = data.officerUsername || data.officerName || data.officer_in_charge || 'ไม่ระบุ';
    const officerAvatarVal = data.officerAvatar || data.officer_avatar || '';
    const descriptionVal = data.description || '';
    const imageVal = data.image || '';
    const discordMsgIdVal = data.messageId || data.discordMessageId || data.discord_message_id || '';
    const guildIdVal = data.guildId || data.guild_id || '';
    const createdAtVal = data.createdAt || data.created_at || new Date().toISOString();

    // Process helpers array (support helperDiscordIds & helperUsernames arrays or helpers objects)
    let helpersArr: any[] = [];
    if (Array.isArray(data.helpers)) {
      helpersArr = data.helpers.map((h: any) => {
        if (typeof h === 'string') {
          return { discord_id: h, id: h, discordId: h, name: h };
        }
        if (typeof h === 'object' && h !== null) {
          const dId = h.discord_id || h.discordId || h.id || '';
          const name = h.username || h.name || h.fullname || dId;
          return { discord_id: dId, id: dId, discordId: dId, name, username: name };
        }
        return h;
      });
    } else if (Array.isArray(data.helperDiscordIds)) {
      helpersArr = data.helperDiscordIds.map((id: string, idx: number) => {
        const username = data.helperUsernames && data.helperUsernames[idx] ? data.helperUsernames[idx] : id;
        return {
          discord_id: id,
          id,
          discordId: id,
          name: username,
          username,
        };
      });
    } else if (typeof data.helpers === 'string') {
      try {
        const parsed = JSON.parse(data.helpers);
        if (Array.isArray(parsed)) {
          helpersArr = parsed.map((h: any) => {
            if (typeof h === 'string') return { discord_id: h, id: h, discordId: h, name: h };
            const dId = h.discord_id || h.discordId || h.id || '';
            const name = h.username || h.name || h.fullname || dId;
            return { discord_id: dId, id: dId, discordId: dId, name, username: name };
          });
        }
      } catch (_) {
        if (data.helpers.trim()) {
          helpersArr = data.helpers.split(',').map((h: string) => {
            const trimmed = h.trim();
            return { discord_id: trimmed, id: trimmed, discordId: trimmed, name: trimmed };
          });
        }
      }
    }

    const helpersJson = JSON.stringify(helpersArr);
    const assistantOfficerStr = helpersArr.map((h: any) => h.name || h.username || h.discord_id || h.id || String(h)).join(', ') || 'ไม่มี';
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
          created_at = ?
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
          helpers, image, guild_id, discord_message_id, status, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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

  async createCase(data: any) {
    return this.createFromBot(data);
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
    const allCases = await this.getByOfficerDiscordId(officerDiscordId);

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

    // Standard case types required by the prompt: normal, take2, red, raid
    const typeStatsMap: Record<string, { selfCount: number; helperCount: number }> = {
      normal: { selfCount: 0, helperCount: 0 },
      take2: { selfCount: 0, helperCount: 0 },
      red: { selfCount: 0, helperCount: 0 },
      raid: { selfCount: 0, helperCount: 0 },
    };

    const extractSnowflake = (str?: string) => {
      const match = (str || '').match(/\d{17,20}/);
      return match ? match[0] : '';
    };

    const userSnowflake = extractSnowflake(officerDiscordId);
    let totalAllCases = 0;

    filteredCases.forEach((c) => {
      const rawType = (c.case_type || c.type || '').toLowerCase().trim();
      let normType = 'normal';
      if (rawType === 'take2' || rawType.includes('take2')) normType = 'take2';
      else if (rawType === 'red' || rawType.includes('ส้ม') || rawType.includes('red') || rawType.includes('orange')) normType = 'red';
      else if (rawType === 'raid' || rawType.includes('จัดร้าน') || rawType.includes('shop') || rawType.includes('raid')) normType = 'raid';
      else normType = 'normal';

      if (!typeStatsMap[normType]) {
        typeStatsMap[normType] = { selfCount: 0, helperCount: 0 };
      }

      // Check primary officer (ลงเอง) strictly by Discord Snowflake ID
      const rawOfficer = c.officer_discord_id || c.officerDiscordId || c.officerId || c.officer_in_charge || '';
      const officerSnowflake = extractSnowflake(rawOfficer);
      const isPrimary = Boolean(userSnowflake && officerSnowflake && officerSnowflake === userSnowflake);

      // Check helper (ถูกแท็ก) strictly by Discord Snowflake ID
      let isHelper = false;
      if (!isPrimary && userSnowflake) {
        let helperStr = '';
        if (typeof c.helpers === 'string') {
          helperStr += ' ' + c.helpers;
        } else if (Array.isArray(c.helpers)) {
          helperStr += ' ' + JSON.stringify(c.helpers);
        }
        if (c.assistant_officer) {
          helperStr += ' ' + c.assistant_officer;
        }
        const helperMatches = Array.from(helperStr.matchAll(/\d{17,20}/g)).map((m) => m[0]);
        isHelper = helperMatches.includes(userSnowflake);
      }

      if (isPrimary) {
        typeStatsMap[normType].selfCount += 1;
        totalAllCases += 1;
      } else if (isHelper) {
        typeStatsMap[normType].helperCount += 1;
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
