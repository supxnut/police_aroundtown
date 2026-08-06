import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { logModel } from '../models/logModel';

export const logController = {
  async getAdminLogs(req: AuthRequest, res: Response) {
    try {
      const logs = await logModel.getAll();
      return res.json({ success: true, logs });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message });
    }
  },

  async getDiscordLogs(req: AuthRequest, res: Response) {
    try {
      const discordLogs = await logModel.getDiscordLogs();
      return res.json({ success: true, discordLogs });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message });
    }
  },

  async exportCsv(req: AuthRequest, res: Response) {
    try {
      const logs = await logModel.getAll();
      let csv = 'ID,Admin Discord ID,Action,Date,Time,Affected User\n';
      logs.forEach(l => {
        csv += `"${l.id}","${l.admin_discord_id}","${l.action.replace(/"/g, '""')}","${l.date}","${l.time}","${l.affected_user.replace(/"/g, '""')}"\n`;
      });
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="audit_logs.csv"');
      return res.send('\uFEFF' + csv);
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message });
    }
  }
};
