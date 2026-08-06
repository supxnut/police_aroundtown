import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { caseModel } from '../models/caseModel';
import { logAdminAction } from '../services/logService';
import { DutyValidationService } from '../services/dutyValidationService';

export const caseController = {
  async getAllCases(req: AuthRequest, res: Response) {
    try {
      const cases = await caseModel.getAll();
      const totalCount = await caseModel.getCount();
      return res.json({ success: true, cases, totalCount });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message });
    }
  },

  async createCase(req: AuthRequest, res: Response) {
    try {
      const { case_number, title, description, suspect_name, officer_in_charge, officer_discord_id, status } = req.body;
      if (!case_number || !title) {
        return res.status(400).json({ success: false, message: 'Case number and title are required' });
      }

      const id = await caseModel.create({
        case_number,
        title,
        description: description || '',
        suspect_name: suspect_name || 'Unknown',
        officer_in_charge: officer_in_charge || 'Unassigned',
        status: status || 'open'
      });

      if (officer_discord_id) {
        await caseModel.update(id, { officer_discord_id });
      }

      // Run Duty Validation Layer check immediately
      try {
        await DutyValidationService.validateCaseById(id);
      } catch (valErr) {
        console.error('Validation error on create case:', valErr);
      }

      if (req.user) {
        await logAdminAction(req.user.discord_id, `Created police case ${case_number}: ${title}`, officer_in_charge || 'N/A');
      }

      return res.status(201).json({ success: true, id, message: 'Case created successfully' });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message });
    }
  },

  async updateCase(req: AuthRequest, res: Response) {
    try {
      const id = parseInt(req.params.id);
      const { case_number, title, description, suspect_name, officer_in_charge, officer_discord_id, status } = req.body;

      const updated = await caseModel.update(id, { case_number, title, description, suspect_name, officer_in_charge, officer_discord_id, status });
      if (!updated) {
        return res.status(404).json({ success: false, message: 'Case not found' });
      }

      // Re-run Duty Validation check for updated case
      try {
        await DutyValidationService.validateCaseById(id);
      } catch (valErr) {
        console.error('Validation error on update case:', valErr);
      }

      if (req.user) {
        await logAdminAction(req.user.discord_id, `Updated case #${id} (${case_number})`, officer_in_charge || 'N/A');
      }

      return res.json({ success: true, message: 'Case updated successfully' });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message });
    }
  },

  async deleteCase(req: AuthRequest, res: Response) {
    try {
      const id = parseInt(req.params.id);
      const deleted = await caseModel.delete(id);
      if (!deleted) {
        return res.status(404).json({ success: false, message: 'Case not found' });
      }

      if (req.user) {
        await logAdminAction(req.user.discord_id, `Deleted case #${id}`, `Case #${id}`);
      }

      return res.json({ success: true, message: 'Case deleted successfully' });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message });
    }
  },

  async exportCsv(req: AuthRequest, res: Response) {
    try {
      const cases = await caseModel.getAll();
      let csv = 'ID,Case Number,Title,Description,Suspect,Officer in Charge,Status,Date\n';
      cases.forEach(c => {
        csv += `"${c.id}","${c.case_number}","${c.title.replace(/"/g, '""')}","${(c.description || '').replace(/"/g, '""')}","${(c.suspect_name || '').replace(/"/g, '""')}","${(c.officer_in_charge || '').replace(/"/g, '""')}","${c.status}","${c.created_at || ''}"\n`;
      });
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="police_cases.csv"');
      return res.send('\uFEFF' + csv);
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message });
    }
  }
};
