import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { caseReportModel } from '../models/caseReportModel';

export const caseReportController = {
  async getCaseReport(req: AuthRequest, res: Response) {
    try {
      const { range, search, page, limit } = req.query;

      const reportData = await caseReportModel.getReport({
        range: (range as any) || 'all',
        search: (search as string) || '',
        page: page ? parseInt(page as string) : 1,
        limit: limit ? parseInt(limit as string) : 10,
      });

      return res.json({
        success: true,
        ...reportData
      });
    } catch (error: any) {
      console.error("Case Report Fetch Error:", error);
      return res.status(500).json({ success: false, message: error.message || 'Failed to generate case report' });
    }
  },

  async exportCsv(req: AuthRequest, res: Response) {
    try {
      const { range, search } = req.query;

      // Get all matching records for current filter/search without page limit
      const reportData = await caseReportModel.getReport({
        range: (range as any) || 'all',
        search: (search as string) || '',
        page: 1,
        limit: 100000,
      });

      const todayStr = new Date().toISOString().split('T')[0];

      // UTF-8 CSV Headers for Thai Excel
      let csv = 'วันที่,เวลา,ประเภทคดี,ผู้รับผิดชอบคดี,ผู้ช่วยปฏิบัติงาน,Discord ID,ยศ\n';

      reportData.cases.forEach((c) => {
        const clean = (val: string) => `"${(val || '').toString().replace(/"/g, '""')}"`;

        csv += `${clean(c.date)},${clean(c.time)},${clean(c.title)},${clean(c.officer_in_charge)},${clean(c.assistant_officer)},${clean(c.discord_id)},${clean(c.rank)}\n`;
      });

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="Case_Report_${todayStr}.csv"`);
      return res.send('\uFEFF' + csv);
    } catch (error: any) {
      console.error("Case Report Export Error:", error);
      return res.status(500).json({ success: false, message: error.message || 'Failed to export case report CSV' });
    }
  }
};
