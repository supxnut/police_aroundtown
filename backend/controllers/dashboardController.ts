import { Request, Response } from 'express';
import { query, queryOne } from '../database/db';
import { dutyModel } from '../models/dutyModel';
import { userModel } from '../models/userModel';
import { caseModel } from '../models/caseModel';
import { activityModel } from '../models/activityModel';

export const dashboardController = {
  async getOfficerDashboard(req: Request, res: Response) {
    try {
      const discordId = req.params.discordId || (req.query.discordId as string) || '';
      const filterType = (req.query.filterType || req.query.dateFilter || 'all') as any;
      const startDate = req.query.startDate as string;
      const endDate = req.query.endDate as string;

      const dbUser = discordId ? await userModel.findByDiscordId(discordId) : null;
      const officerName = dbUser ? dbUser.fullname : (req.query.officerName as string || '');

      const summary = await caseModel.getOfficerStats(discordId, officerName, filterType, startDate, endDate);
      const caseCount = await caseModel.getCount();

      const dutyStats = await dutyModel.getSummaryStats();
      const openCasesRes = await queryOne("SELECT COUNT(*) as count FROM cases WHERE status = 'open'");
      const closedCasesRes = await queryOne("SELECT COUNT(*) as count FROM cases WHERE status = 'closed'");
      const pendingCasesRes = await queryOne("SELECT COUNT(*) as count FROM cases WHERE status = 'pending'");

      return res.json({
        success: true,
        discordId,
        officer: dbUser ? {
          id: dbUser.id,
          discord_id: dbUser.discord_id,
          fullname: dbUser.fullname,
          rank: dbUser.rank,
          start_date: dbUser.start_date,
          avatar: dbUser.avatar,
        } : null,
        totalCases: summary.totalAllCases,
        breakdown: summary.breakdown,
        summary: {
          totalAllCases: summary.totalAllCases,
          totalDbCases: caseCount,
        },
        duty_hours: {
          today: dutyStats.todayHours,
          weekly: dutyStats.weekHours,
          monthly: dutyStats.monthHours,
          total: dutyStats.totalHours,
        },
        case_stats: {
          total: caseCount,
          open: openCasesRes ? parseInt(openCasesRes.count) : 0,
          closed: closedCasesRes ? parseInt(closedCasesRes.count) : 0,
          pending: pendingCasesRes ? parseInt(pendingCasesRes.count) : 0,
        },
      });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message });
    }
  },

  async getDashboardData(req: Request, res: Response) {
    try {
      const dutyStats = await dutyModel.getSummaryStats();
      const officerCount = await userModel.countAll();
      const caseCount = await caseModel.getCount();

      const openCasesRes = await queryOne("SELECT COUNT(*) as count FROM cases WHERE status = 'open'");
      const closedCasesRes = await queryOne("SELECT COUNT(*) as count FROM cases WHERE status = 'closed'");
      const pendingCasesRes = await queryOne("SELECT COUNT(*) as count FROM cases WHERE status = 'pending'");

      const activeOfficersRes = await queryOne("SELECT COUNT(*) as count FROM users WHERE active = 1");

      const activeActivitiesRes = await queryOne("SELECT COUNT(*) as count FROM activities WHERE status = 'active'");
      const finishedActivitiesRes = await queryOne("SELECT COUNT(*) as count FROM activities WHERE status = 'finished'");

      return res.json({
        success: true,
        duty_hours: {
          today: dutyStats.todayHours,
          weekly: dutyStats.weekHours,
          monthly: dutyStats.monthHours,
          total: dutyStats.totalHours,
        },
        case_stats: {
          total: caseCount,
          open: openCasesRes ? parseInt(openCasesRes.count) : 0,
          closed: closedCasesRes ? parseInt(closedCasesRes.count) : 0,
          pending: pendingCasesRes ? parseInt(pendingCasesRes.count) : 0,
        },
        officer_stats: {
          total: officerCount,
          active: activeOfficersRes ? parseInt(activeOfficersRes.count) : 0,
        },
        activity_stats: {
          active: activeActivitiesRes ? parseInt(activeActivitiesRes.count) : 0,
          finished: finishedActivitiesRes ? parseInt(finishedActivitiesRes.count) : 0,
        },
      });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message });
    }
  },
};
