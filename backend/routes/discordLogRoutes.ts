import { Router, Request, Response } from 'express';
import { parseDiscordLog } from '../controllers/discordParserController';
import { caseModel } from '../models/caseModel';
import { dutyModel } from '../models/dutyModel';
import { userModel } from '../models/userModel';
import { activityModel } from '../models/activityModel';
import { evidenceModel } from '../models/evidenceModel';
import { wantedModel } from '../models/wantedModel';
import { logAdminAction } from '../services/logService';
import { realtimeService } from '../services/realtimeService';
import { DutyValidationService } from '../services/dutyValidationService';

const router = Router();

router.post('/log', async (req: Request, res: Response) => {
  try {
    const { log_text } = req.body;
    if (!log_text || typeof log_text !== 'string') {
      return res.status(400).json({ success: false, error: 'log_text is required.' });
    }

    let parsed = await parseDiscordLog(log_text);
    if (!parsed || !parsed.success) {
      // Retry once if invalid
      parsed = await parseDiscordLog(log_text);
    }

    if (!parsed || !parsed.success) {
      return res.status(422).json({ success: false, error: 'Unable to parse Discord log.' });
    }

    const recType = parsed.record_type;

    if (recType === 'case') {
      const caseNumber = parsed.case_number || `CASE-${Date.now().toString().slice(-6)}`;
      const caseType = parsed.case_type || 'คดีปกติ';
      const id = await caseModel.create({
        case_number: caseNumber,
        title: parsed.case_title || caseType,
        case_type: caseType,
        description: parsed.description || '',
        suspect_name: Array.isArray(parsed.suspects) && parsed.suspects.length > 0 ? parsed.suspects.join(', ') : 'Unknown',
        officer_in_charge: parsed.officer || 'Unassigned',
        assistant_officer: Array.isArray(parsed.assistant) ? parsed.assistant.join(', ') : (parsed.assistant || 'ไม่มี'),
        status: parsed.status === 'ปิดคดี' ? 'closed' : 'open',
      });
      try { await DutyValidationService.validateCaseById(id); } catch (_) {}
      realtimeService.broadcast('CASE_CREATED', { id, case_number: caseNumber });
    } else if (recType === 'duty') {
      let user = null;
      if (parsed.officer) {
        user = await userModel.findByDiscordId(parsed.officer);
      }
      if (user) {
        const todayStr = parsed.timestamp ? new Date(parsed.timestamp).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
        const timeStr = parsed.timestamp ? new Date(parsed.timestamp).toTimeString().split(' ')[0].substring(0, 5) : '08:00';
        await dutyModel.create({
          user_id: user.id,
          date: todayStr,
          start_time: timeStr,
          end_time: timeStr,
          hours: parsed.jail_time || 0,
        });
        realtimeService.broadcast('DUTY_LOGGED', { user_id: user.id });
      }
    } else if (recType === 'evidence') {
      await evidenceModel.create({
        case_number: parsed.case_number || '',
        title: parsed.case_title || 'Captured Evidence',
        description: parsed.description || '',
        items: Array.isArray(parsed.evidence) ? parsed.evidence.join(', ') : '',
        image: parsed.image || '',
        officer_name: parsed.officer || '',
      });
      realtimeService.broadcast('EVIDENCE_UPDATED', { type: 'create' });
    } else if (recType === 'wanted') {
      await wantedModel.create({
        suspect_name: Array.isArray(parsed.suspects) && parsed.suspects.length > 0 ? parsed.suspects.join(', ') : 'Unknown',
        charges: parsed.description || parsed.case_title || 'Wanted Warrant',
        reward: parsed.fine || 0,
        status: 'active',
        officer_in_charge: parsed.officer || '',
        image: parsed.image || '',
      });
      realtimeService.broadcast('WANTED_UPDATED', { type: 'create' });
    } else if (recType === 'audit') {
      await logAdminAction(parsed.officer || 'SYSTEM', parsed.description || 'Discord Log Audit', parsed.officer || 'N/A');
      realtimeService.broadcast('LOG_CREATED', { type: 'audit' });
    }

    return res.status(200).json(parsed);
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
