import { query, queryOne } from '../database/db';
import { alertModel } from '../models/alertModel';
import client from '../../discord-bot/bot';
import { EmbedBuilder } from 'discord.js';

export class DutyValidationService {
  /**
   * Helper: Send Discord Alert Embed to ADMIN_ALERT_CHANNEL_ID if configured
   */
  private static async sendDiscordAlertEmbed(data: {
    officerName: string;
    discordId: string;
    caseNumber: string;
    caseTime: string;
    alertType: string;
    message: string;
  }) {
    const alertChannelId = process.env.ADMIN_ALERT_CHANNEL_ID;
    if (!alertChannelId || !client || !client.isReady()) {
      return;
    }

    try {
      const channel = await client.channels.fetch(alertChannelId);
      if (channel && channel.isTextBased()) {
        const typeTitleMap: Record<string, string> = {
          NO_DUTY_LOG: '🚨 ตรวจพบการรับคดีโดยไม่มีข้อมูลเข้าเวร',
          CASE_OUTSIDE_DUTY: '⚠️ ตรวจพบการรับคดีนอกเวลาเข้าเวร',
          UNKNOWN_OFFICER: '❓ ตรวจพบเจ้าหน้าที่รับคดีไม่มีข้อมูลในระบบ',
        };

        const embed = new EmbedBuilder()
          .setTitle(typeTitleMap[data.alertType] || '🚨 ตรวจพบความผิดปกติในการรับคดี')
          .setColor(0xEF4444)
          .addFields(
            { name: 'เจ้าหน้าที่', value: data.officerName || 'ไม่ระบุ', inline: true },
            { name: 'Discord ID', value: data.discordId || 'N/A', inline: true },
            { name: 'เลขคดี', value: data.caseNumber, inline: true },
            { name: 'เวลารับคดี', value: data.caseTime, inline: false },
            { name: 'รายละเอียดความผิดปกติ', value: data.message, inline: false }
          )
          .setTimestamp();

        await (channel as any).send({ embeds: [embed] });
      }
    } catch (err) {
      console.error('Failed to send Discord alert notification:', err);
    }
  }

  /**
   * Match officer user from database using priority:
   * 1. Discord User ID / Discord ID
   * 2. Discord ID
   * 3. Citizen ID
   * 4. Steam Identifier
   * 5. Officer Name (Only if NO Discord ID is present!)
   */
  public static async matchOfficerUser(caseData: {
    officer_in_charge?: string;
    officer_discord_id?: string;
    description?: string;
    title?: string;
  }): Promise<{ user: any | null; hasExplicitDiscordId: boolean }> {
    let rawDiscordId = (caseData.officer_discord_id || '').trim();

    // If no explicit officer_discord_id, try to extract mention or numeric Discord ID from text
    if (!rawDiscordId && (caseData.description || caseData.title)) {
      const fullText = `${caseData.title || ''} ${caseData.description || ''}`;
      const mentionMatch = fullText.match(/<@!?(\d{17,20})>/);
      if (mentionMatch) {
        rawDiscordId = mentionMatch[1];
      } else {
        const idMatch = fullText.match(/\b\d{17,20}\b/);
        if (idMatch) rawDiscordId = idMatch[0];
      }
    }

    const hasExplicitDiscordId = Boolean(rawDiscordId);

    // Priority 1 & 2: Match by Discord ID
    if (rawDiscordId) {
      const userByDiscord = await queryOne('SELECT * FROM users WHERE discord_id = ?', [rawDiscordId]);
      if (userByDiscord) {
        return { user: userByDiscord, hasExplicitDiscordId };
      }
    }

    // Priority 3 & 4: Match by Citizen ID or Steam Identifier in text/user if present
    if (caseData.description) {
      const citizenMatch = caseData.description.match(/citizen\s*id[:\s]*([a-z0-9_-]+)/i);
      if (citizenMatch) {
        const userByCitizen = await queryOne('SELECT * FROM users WHERE fullname LIKE ? OR discord_id = ?', [
          `%${citizenMatch[1]}%`,
          citizenMatch[1]
        ]);
        if (userByCitizen) return { user: userByCitizen, hasExplicitDiscordId };
      }

      const steamMatch = caseData.description.match(/steam:11[0-9a-f]+/i);
      if (steamMatch) {
        const userBySteam = await queryOne('SELECT * FROM users WHERE discord_id = ? OR fullname LIKE ?', [
          steamMatch[0],
          `%${steamMatch[0]}%`
        ]);
        if (userBySteam) return { user: userBySteam, hasExplicitDiscordId };
      }
    }

    // Priority 5: Officer Name matching ONLY if NO Discord ID was attached or extracted
    if (!hasExplicitDiscordId && caseData.officer_in_charge) {
      const cleanName = caseData.officer_in_charge.trim();
      if (cleanName && cleanName.toLowerCase() !== 'unassigned' && cleanName.toLowerCase() !== 'unknown') {
        const userByName = await queryOne(
          'SELECT * FROM users WHERE LOWER(fullname) = LOWER(?) OR LOWER(fullname) LIKE LOWER(?)',
          [cleanName, `%${cleanName}%`]
        );
        if (userByName) {
          return { user: userByName, hasExplicitDiscordId: false };
        }
      }
    }

    return { user: null, hasExplicitDiscordId };
  }

  /**
   * Validate a case record against officer duty logs
   */
  public static async validateCaseRecord(caseRecord: any): Promise<{ valid: boolean; alertType?: string; message?: string }> {
    if (!caseRecord) return { valid: true };

    const { user, hasExplicitDiscordId } = await this.matchOfficerUser(caseRecord);

    // Case 1: Unknown Officer (User not found in system)
    if (!user) {
      // If officer was unassigned, ignore
      const officerName = caseRecord.officer_in_charge || 'ไม่ระบุ';
      if (officerName.toLowerCase() === 'unassigned' || officerName.toLowerCase() === 'unassigned officer') {
        return { valid: true };
      }

      const alertType = 'UNKNOWN_OFFICER';
      const caseTimeStr = caseRecord.received_time || 'ไม่ระบุเวลา';
      const message = `ไม่พบข้อมูลเจ้าหน้าที่ในระบบ MDT (เจ้าหน้าที่: "${officerName}" / Discord ID: "${caseRecord.officer_discord_id || 'N/A'}")`;

      await this.upsertAlert({
        officer_id: null,
        case_id: caseRecord.id,
        case_number: caseRecord.case_number,
        alert_type: alertType,
        message,
        duty_start_time: 'N/A',
        duty_end_time: 'N/A',
        case_time: caseTimeStr,
        officerName,
        discordId: caseRecord.officer_discord_id || 'N/A'
      });

      return { valid: false, alertType, message };
    }

    // Determine exact Case Timestamp
    const createdAtStr = caseRecord.created_at || new Date().toISOString();
    const caseDateStr = createdAtStr.substring(0, 10); // YYYY-MM-DD
    let caseTimeStr = caseRecord.received_time || '';

    if (!caseTimeStr || caseTimeStr === '08:00') {
      const timeMatch = createdAtStr.match(/\d{2}:\d{2}/);
      if (timeMatch) {
        caseTimeStr = timeMatch[0];
      } else {
        caseTimeStr = '00:00';
      }
    }

    const caseDateTimeString = `${caseDateStr}T${caseTimeStr.length === 5 ? caseTimeStr : '00:00'}:00`;
    const caseTimestamp = new Date(caseDateTimeString).getTime();

    // Fetch all duty logs for this officer within 1 day window
    const prevDate = new Date(new Date(caseDateStr).getTime() - 86400000).toISOString().split('T')[0];
    const nextDate = new Date(new Date(caseDateStr).getTime() + 86400000).toISOString().split('T')[0];

    const dutyLogs = await query(
      `SELECT * FROM duty_logs WHERE user_id = ? AND date BETWEEN ? AND ? ORDER BY date ASC, start_time ASC`,
      [user.id, prevDate, nextDate]
    );

    // Buffer allowance: 5 minutes (300,000 ms)
    const BUFFER_MS = 5 * 60 * 1000;
    let isOnDutyAtCaseTime = false;
    let matchingDutyStart = '';
    let matchingDutyEnd = '';
    const dutyWindows: string[] = [];

    for (const dl of dutyLogs) {
      if (!dl.start_time) continue;

      const logStartIso = `${dl.date}T${dl.start_time.length === 5 ? dl.start_time : '00:00'}:00`;
      const startMs = new Date(logStartIso).getTime();

      let endMs: number;
      let displayEnd = dl.end_time || 'ยังไม่ออกเวร';

      if (dl.end_time && dl.end_time.trim() !== '') {
        const partsStart = dl.start_time.split(':').map(Number);
        const partsEnd = dl.end_time.split(':').map(Number);
        const startVal = partsStart[0] * 60 + partsStart[1];
        const endVal = partsEnd[0] * 60 + partsEnd[1];

        if (endVal >= startVal) {
          // Same day shift
          endMs = new Date(`${dl.date}T${dl.end_time.length === 5 ? dl.end_time : '00:00'}:00`).getTime();
        } else {
          // Overnight shift crossing midnight
          const nextDayIso = new Date(new Date(dl.date).getTime() + 86400000).toISOString().split('T')[0];
          endMs = new Date(`${nextDayIso}T${dl.end_time.length === 5 ? dl.end_time : '00:00'}:00`).getTime();
        }
      } else {
        // Open shift (currently on duty or forgot to clock out)
        // Allow up to current time or 24h after shift start
        endMs = Math.max(Date.now(), startMs + 24 * 60 * 60 * 1000);
      }

      dutyWindows.push(`${dl.start_time} - ${displayEnd} (${dl.date})`);

      if (caseTimestamp >= (startMs - BUFFER_MS) && caseTimestamp <= (endMs + BUFFER_MS)) {
        isOnDutyAtCaseTime = true;
        matchingDutyStart = `${dl.date} ${dl.start_time}`;
        matchingDutyEnd = displayEnd;
        break;
      }
    }

    // Case 2: VALID (Officer was ON DUTY)
    if (isOnDutyAtCaseTime) {
      // Clear or resolve any existing pending alert for this case
      await alertModel.deleteByCaseId(caseRecord.id);
      return { valid: true };
    }

    // Case 3: INVALID - Anomaly detected!
    let alertType = 'NO_DUTY_LOG';
    let message = '';

    if (dutyLogs.length === 0) {
      alertType = 'NO_DUTY_LOG';
      message = `เจ้าหน้าที่ ${user.fullname} (Discord: ${user.discord_id}) รับคดี #${caseRecord.case_number} เมื่อ ${caseDateStr} ${caseTimeStr} แต่ไม่มีข้อมูลเข้าเวร`;
    } else {
      alertType = 'CASE_OUTSIDE_DUTY';
      const dutyWindowsText = dutyWindows.join(', ');
      message = `เจ้าหน้าที่ ${user.fullname} (Discord: ${user.discord_id}) รับคดี #${caseRecord.case_number} เมื่อ ${caseDateStr} ${caseTimeStr} แต่นอกเวลาเข้าเวร (เวลาเข้าเวรบันทึกไว้: ${dutyWindowsText})`;
    }

    await this.upsertAlert({
      officer_id: user.id,
      case_id: caseRecord.id,
      case_number: caseRecord.case_number,
      alert_type: alertType,
      message,
      duty_start_time: matchingDutyStart || 'N/A',
      duty_end_time: matchingDutyEnd || 'N/A',
      case_time: `${caseDateStr} ${caseTimeStr}`,
      officerName: user.fullname,
      discordId: user.discord_id
    });

    return { valid: false, alertType, message };
  }

  /**
   * Helper to insert or update an alert in case_alerts
   */
  private static async upsertAlert(alertData: {
    officer_id: number | null;
    case_id: number;
    case_number: string;
    alert_type: string;
    message: string;
    duty_start_time: string;
    duty_end_time: string;
    case_time: string;
    officerName: string;
    discordId: string;
  }) {
    const existing = await queryOne('SELECT * FROM case_alerts WHERE case_id = ?', [alertData.case_id]);

    let isNewAlert = false;

    if (existing) {
      if (existing.status === 'PENDING') {
        await query(
          `UPDATE case_alerts 
           SET officer_id = ?, case_number = ?, alert_type = ?, message = ?, severity = 'HIGH', 
               duty_start_time = ?, duty_end_time = ?, case_time = ?, created_at = CURRENT_TIMESTAMP
           WHERE id = ?`,
          [
            alertData.officer_id,
            alertData.case_number,
            alertData.alert_type,
            alertData.message,
            alertData.duty_start_time,
            alertData.duty_end_time,
            alertData.case_time,
            existing.id
          ]
        );
      }
    } else {
      isNewAlert = true;
      await query(
        `INSERT INTO case_alerts 
         (officer_id, case_id, case_number, alert_type, message, severity, status, duty_start_time, duty_end_time, case_time)
         VALUES (?, ?, ?, ?, ?, 'HIGH', 'PENDING', ?, ?, ?)`,
        [
          alertData.officer_id,
          alertData.case_id,
          alertData.case_number,
          alertData.alert_type,
          alertData.message,
          alertData.duty_start_time,
          alertData.duty_end_time,
          alertData.case_time
        ]
      );
    }

    // Send Discord Embed Notification if new alert
    if (isNewAlert) {
      await this.sendDiscordAlertEmbed({
        officerName: alertData.officerName,
        discordId: alertData.discordId,
        caseNumber: alertData.case_number,
        caseTime: alertData.case_time,
        alertType: alertData.alert_type,
        message: alertData.message
      });
    }
  }

  /**
   * Validate a case by Case ID
   */
  public static async validateCaseById(caseId: number) {
    const caseRecord = await queryOne('SELECT * FROM cases WHERE id = ?', [caseId]);
    if (caseRecord) {
      await this.validateCaseRecord(caseRecord);
    }
  }

  /**
   * Validate a case by Case Number
   */
  public static async validateCaseByNumber(caseNumber: string) {
    const caseRecord = await queryOne('SELECT * FROM cases WHERE case_number = ?', [caseNumber]);
    if (caseRecord) {
      await this.validateCaseRecord(caseRecord);
    }
  }

  /**
   * Re-validate all cases for a specific officer (e.g. after adding/updating duty log)
   */
  public static async revalidateOfficerCasesByUserId(userId: number) {
    const user = await queryOne('SELECT * FROM users WHERE id = ?', [userId]);
    if (!user) return;

    const cases = await query(
      `SELECT * FROM cases WHERE officer_discord_id = ? OR LOWER(officer_in_charge) = LOWER(?)`,
      [user.discord_id, user.fullname]
    );

    for (const c of cases) {
      await this.validateCaseRecord(c);
    }
  }

  /**
   * Re-validate all cases for a specific officer by Discord ID
   */
  public static async revalidateOfficerCasesByDiscordId(discordId: string) {
    const user = await queryOne('SELECT * FROM users WHERE discord_id = ?', [discordId]);
    if (user) {
      await this.revalidateOfficerCasesByUserId(user.id);
    }
  }
}
