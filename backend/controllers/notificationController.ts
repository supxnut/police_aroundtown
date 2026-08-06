import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { notificationModel } from '../models/notificationModel';

export const notificationController = {
  async getNotifications(req: AuthRequest, res: Response) {
    try {
      const items = await notificationModel.getAll();
      return res.json({ success: true, items });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message });
    }
  },

  async createAnnouncement(req: AuthRequest, res: Response) {
    try {
      const { title, message, type } = req.body;
      if (!title || !message) {
        return res.status(400).json({ success: false, message: 'Title and message are required' });
      }

      const id = await notificationModel.create(title, message, type || 'announcement');
      return res.status(201).json({ success: true, id, message: 'Announcement created' });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message });
    }
  }
};
