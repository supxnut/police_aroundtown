import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { dutyModel } from '../models/dutyModel';
import { userModel } from '../models/userModel';
import { logAdminAction } from '../services/logService';
import { DutyValidationService } from '../services/dutyValidationService';

export const dutyController = {
  async getMyDutyLogs(req: AuthRequest, res: Response) {
    try {
      if (!req.user) return res.status(401).json({ success: false, message: 'Unauthorized' });

      const logs = await dutyModel.getByUserId(req.user.id);
      const totalHours = await dutyModel.getTotalHoursByUserId(req.user.id);

      return res.json({ success: true, logs, totalHours });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message });
    }
  },

  async getAllDutyLogs(req: AuthRequest, res: Response) {
    try {
      const logs = await dutyModel.getAll();
      const dutySummary = await dutyModel.getSummaryStats();
      return res.json({ success: true, logs, dutySummary });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message });
    }
  },

  async createDutyLog(req: AuthRequest, res: Response) {
    try {
      const { user_id, date, start_time, end_time, hours } = req.body;
      if (!user_id || !date || !start_time || !end_time) {
        return res.status(400).json({ success: false, message: 'Missing required duty log fields' });
      }

      const calculatedHours = hours ? parseFloat(hours) : 0;
      const id = await dutyModel.create({
        user_id: parseInt(user_id),
        date,
        start_time,
        end_time,
        hours: calculatedHours
      });

      const targetUser = await userModel.findById(parseInt(user_id));
      if (req.user) {
        await logAdminAction(
          req.user.discord_id,
          `Logged ${calculatedHours} hours duty for date ${date}`,
          targetUser ? targetUser.fullname : `User #${user_id}`
        );
      }

      // Re-validate cases for this user
      try {
        await DutyValidationService.revalidateOfficerCasesByUserId(parseInt(user_id));
      } catch (valErr) {
        console.error('Validation recheck error on create duty log:', valErr);
      }

      return res.status(201).json({ success: true, id, message: 'Duty log created' });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message });
    }
  },

  async updateDutyLog(req: AuthRequest, res: Response) {
    try {
      const id = parseInt(req.params.id);
      const { date, start_time, end_time, hours } = req.body;

      const updated = await dutyModel.update(id, { date, start_time, end_time, hours: parseFloat(hours) });
      if (!updated) {
        return res.status(404).json({ success: false, message: 'Duty log not found' });
      }

      // Re-validate cases for this duty log's officer
      try {
        const logRes = await dutyModel.getAll();
        const found = logRes.find(l => l.id === id);
        if (found && found.user_id) {
          await DutyValidationService.revalidateOfficerCasesByUserId(found.user_id);
        }
      } catch (valErr) {
        console.error('Validation recheck error on update duty log:', valErr);
      }

      if (req.user) {
        await logAdminAction(req.user.discord_id, `Updated duty log #${id}`, `Log #${id}`);
      }

      return res.json({ success: true, message: 'Duty log updated' });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message });
    }
  },

  async deleteDutyLog(req: AuthRequest, res: Response) {
    try {
      const id = parseInt(req.params.id);
      const deleted = await dutyModel.delete(id);
      if (!deleted) {
        return res.status(404).json({ success: false, message: 'Duty log not found' });
      }

      if (req.user) {
        await logAdminAction(req.user.discord_id, `Deleted duty log #${id}`, `Log #${id}`);
      }

      return res.json({ success: true, message: 'Duty log deleted' });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message });
    }
  },

  async exportCsv(req: AuthRequest, res: Response) {
    try {
      const logs = await dutyModel.getAll();
      let csv = 'Log ID,Officer,Discord ID,Date,Start Time,End Time,Total Hours\n';
      logs.forEach(l => {
        csv += `"${l.id}","${(l.fullname || '').replace(/"/g, '""')}","${l.discord_id || ''}","${l.date}","${l.start_time}","${l.end_time}","${l.hours}"\n`;
      });
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="duty_logs.csv"');
      return res.send('\uFEFF' + csv);
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message });
    }
  }
};
