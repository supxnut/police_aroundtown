import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { alertModel } from '../models/alertModel';
import { logAdminAction } from '../services/logService';

export const caseAlertController = {
  async getAlerts(req: AuthRequest, res: Response) {
    try {
      const { status, page, limit } = req.query;

      const result = await alertModel.getAll({
        status: (status as string) || 'ALL',
        page: page ? parseInt(page as string) : 1,
        limit: limit ? parseInt(limit as string) : 20,
      });

      return res.json({
        success: true,
        ...result
      });
    } catch (error: any) {
      console.error('Fetch alerts error:', error);
      return res.status(500).json({ success: false, message: error.message || 'Failed to fetch case alerts' });
    }
  },

  async getPendingCount(req: AuthRequest, res: Response) {
    try {
      const count = await alertModel.getPendingCount();
      return res.json({
        success: true,
        count
      });
    } catch (error: any) {
      console.error('Fetch alert count error:', error);
      return res.status(500).json({ success: false, message: error.message || 'Failed to fetch alert count' });
    }
  },

  async markAsReviewed(req: AuthRequest, res: Response) {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ success: false, message: 'Invalid alert ID' });
      }

      const reviewer = req.user ? req.user.fullname : 'Admin';
      const success = await alertModel.markAsReviewed(id, reviewer);

      if (!success) {
        return res.status(404).json({ success: false, message: 'Alert not found' });
      }

      if (req.user) {
        await logAdminAction(req.user.discord_id, `Reviewed case alert #${id}`, `Alert #${id}`);
      }

      return res.json({
        success: true,
        message: 'Marked alert as reviewed successfully'
      });
    } catch (error: any) {
      console.error('Review alert error:', error);
      return res.status(500).json({ success: false, message: error.message || 'Failed to mark alert as reviewed' });
    }
  }
};
