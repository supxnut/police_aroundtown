import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { caseModel } from '../models/caseModel';
import { logAdminAction } from '../services/logService';
import { DutyValidationService } from '../services/dutyValidationService';
import { realtimeService } from '../services/realtimeService';
import { syncDiscordCases } from '../../discordLogSync.server';

export const caseController = {
  async getAllCases(req: Request, res: Response) {
    try {
      await syncDiscordCases();
      const authReq = req as AuthRequest;
      const queryDiscordId = (req.query.discordId as string) || (req.query.officerDiscordId as string) || '';
      const requireAll = req.query.all === 'true';

      let discordIdToFilter = queryDiscordId;
      if (!discordIdToFilter && !requireAll && authReq.user && !authReq.user.isAdmin) {
        discordIdToFilter = authReq.user.discord_id;
      }

      const cases = discordIdToFilter
        ? await caseModel.getByOfficerDiscordId(discordIdToFilter)
        : await caseModel.getAll();

      const totalCount = cases.length;
      return res.json({ success: true, cases, totalCount });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message });
    }
  },

  async createCase(req: Request, res: Response) {
    try {
      const body = req.body;

      // Handle Bot Payload or Admin Form Payload
      const { id, caseData } = await caseModel.createFromBot(body);

      // Run Duty Validation Layer check if applicable
      try {
        await DutyValidationService.validateCaseById(id);
      } catch (valErr) {
        console.error('Validation check error on case create:', valErr);
      }

      // Broadcast Realtime Update to connected web dashboards
      try {
        realtimeService.broadcast('CASE_CREATED', caseData);
      } catch (rtErr) {
        console.error('Realtime broadcast error:', rtErr);
      }

      const authReq = req as AuthRequest;
      if (authReq.user) {
        await logAdminAction(
          authReq.user.discord_id,
          `Logged case ${caseData.case_number}: ${caseData.type}`,
          caseData.officer_in_charge || 'N/A'
        );
      }

      return res.status(201).json({
        success: true,
        id,
        case: caseData,
        message: 'บันทึกข้อมูลคดีเรียบร้อยแล้ว'
      });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message });
    }
  },

  async getOfficerStats(req: Request, res: Response) {
    try {
      const officerDiscordId = (req.params.discordId || req.query.officerId || req.query.discord_id || '') as string;
      const officerName = (req.query.officerName || req.query.name || '') as string;
      const dateFilter = (req.query.filterType || req.query.dateFilter || 'all') as any;
      const startDate = req.query.startDate as string;
      const endDate = req.query.endDate as string;

      if (!officerDiscordId && !officerName) {
        return res.status(400).json({ success: false, message: 'Officer Discord ID or Officer Name is required' });
      }

      const summary = await caseModel.getOfficerStats(officerDiscordId, officerName, dateFilter, startDate, endDate);
      return res.json({ success: true, summary });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message });
    }
  },

  async updateCase(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id);
      const { case_number, title, case_type, description, suspect_name, officer_in_charge, officer_discord_id, status } = req.body;

      const updated = await caseModel.update(id, { case_number, title, case_type, description, suspect_name, officer_in_charge, officer_discord_id, status });
      if (!updated) {
        return res.status(404).json({ success: false, message: 'Case not found' });
      }

      // Re-run Duty Validation check for updated case
      try {
        await DutyValidationService.validateCaseById(id);
      } catch (valErr) {
        console.error('Validation error on update case:', valErr);
      }

      const updatedCase = await caseModel.findById(id);
      if (updatedCase) {
        realtimeService.broadcast('CASE_UPDATED', updatedCase);
      }

      const authReq = req as AuthRequest;
      if (authReq.user) {
        await logAdminAction(authReq.user.discord_id, `Updated case #${id} (${case_number})`, officer_in_charge || 'N/A');
      }

      return res.json({ success: true, message: 'Case updated successfully', case: updatedCase });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message });
    }
  },

  async deleteCase(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id);
      const deleted = await caseModel.delete(id);
      if (!deleted) {
        return res.status(404).json({ success: false, message: 'Case not found' });
      }

      realtimeService.broadcast('CASE_DELETED', { id });

      const authReq = req as AuthRequest;
      if (authReq.user) {
        await logAdminAction(authReq.user.discord_id, `Deleted case #${id}`, `Case #${id}`);
      }

      return res.json({ success: true, message: 'Case deleted successfully' });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message });
    }
  },

  async exportCsv(req: Request, res: Response) {
    try {
      const cases = await caseModel.getAll();
      let csv = 'ID,Case Number,Type,Title,Description,Suspect,Officer in Charge,Status,Date\n';
      cases.forEach(c => {
        csv += `"${c.id}","${c.case_number}","${c.type || 'คดีปกติ'}","${(c.title || '').replace(/"/g, '""')}","${(c.description || '').replace(/"/g, '""')}","${(c.suspect_name || '').replace(/"/g, '""')}","${(c.officer_in_charge || '').replace(/"/g, '""')}","${c.status}","${c.created_at || ''}"\n`;
      });
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="police_cases.csv"');
      return res.send('\uFEFF' + csv);
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message });
    }
  }
};
