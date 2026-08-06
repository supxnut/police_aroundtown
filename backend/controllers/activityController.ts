import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { activityModel } from '../models/activityModel';
import { logAdminAction } from '../services/logService';

export const activityController = {
  async getPoliceActivities(req: AuthRequest, res: Response) {
    try {
      if (!req.user) return res.status(401).json({ success: false, message: 'Unauthorized' });

      const activities = await activityModel.getActiveForPolice(req.user.id);
      return res.json({ success: true, activities });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message });
    }
  },

  async joinActivity(req: AuthRequest, res: Response) {
    try {
      if (!req.user) return res.status(401).json({ success: false, message: 'Unauthorized' });

      const activityId = parseInt(req.params.id);
      const answer = req.body.answer || req.body.choice || '';
      await activityModel.joinActivity(activityId, req.user.id, answer);

      return res.json({ success: true, message: 'บันทึกคำตอบ / โหวตเรียบร้อยแล้ว!' });
    } catch (error: any) {
      return res.status(400).json({ success: false, message: error.message });
    }
  },

  async getAdminActivities(req: AuthRequest, res: Response) {
    try {
      const activities = await activityModel.getAllForAdmin();
      return res.json({ success: true, activities });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message });
    }
  },

  async getActivityParticipants(req: AuthRequest, res: Response) {
    try {
      const activityId = parseInt(req.params.id);
      const participants = await activityModel.getJoinedUsers(activityId);
      return res.json({ success: true, participants });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message });
    }
  },

  async getActivityHistory(req: AuthRequest, res: Response) {
    try {
      const history = await activityModel.getHistory();
      return res.json({ success: true, history });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message });
    }
  },

  async createActivity(req: AuthRequest, res: Response) {
    try {
      const { title, description, reward, question, options, start_date, end_date, status } = req.body;
      if (!title || !description || !reward || !start_date || !end_date) {
        return res.status(400).json({ success: false, message: 'All activity fields are required' });
      }

      let image = 'https://images.unsplash.com/photo-1508847154043-be5407fcaa5a?w=600';
      if (req.file) {
        image = `/uploads/activities/${req.file.filename}`;
      }

      const id = await activityModel.create({
        title,
        description,
        reward,
        image,
        question: question || 'โปรดโหวตหรือตอบคำถามสำหรับกิจกรรมนี้',
        options: options ? (typeof options === 'string' ? options : JSON.stringify(options)) : undefined,
        start_date,
        end_date,
        status: status || 'active',
      });

      if (req.user) {
        await logAdminAction(req.user.discord_id, `Created activity: ${title}`, 'All Officers');
      }

      return res.status(201).json({ success: true, id, message: 'Activity created successfully' });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message });
    }
  },

  async updateActivity(req: AuthRequest, res: Response) {
    try {
      const id = parseInt(req.params.id);
      const { title, description, reward, question, options, start_date, end_date, status } = req.body;

      let image: string | undefined = undefined;
      if (req.file) {
        image = `/uploads/activities/${req.file.filename}`;
      }

      const updated = await activityModel.update(id, {
        title,
        description,
        reward,
        image,
        question,
        options: options ? (typeof options === 'string' ? options : JSON.stringify(options)) : undefined,
        start_date,
        end_date,
        status: status as 'active' | 'finished',
      });

      if (!updated) {
        return res.status(404).json({ success: false, message: 'Activity not found' });
      }

      if (req.user) {
        await logAdminAction(req.user.discord_id, `Updated activity #${id}: ${title || 'Activity'}`, 'All Officers');
      }

      return res.json({ success: true, message: 'Activity updated successfully' });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message });
    }
  },

  async deleteActivity(req: AuthRequest, res: Response) {
    try {
      const id = parseInt(req.params.id);
      const deleted = await activityModel.delete(id);
      if (!deleted) {
        return res.status(404).json({ success: false, message: 'Activity not found' });
      }

      if (req.user) {
        await logAdminAction(req.user.discord_id, `Deleted activity #${id}`, `Activity #${id}`);
      }

      return res.json({ success: true, message: 'Activity deleted successfully' });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message });
    }
  }
};
