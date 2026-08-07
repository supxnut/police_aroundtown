import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { wantedModel } from '../models/wantedModel';
import { realtimeService } from '../services/realtimeService';

export const wantedController = {
  async getAll(req: AuthRequest, res: Response) {
    try {
      const items = await wantedModel.getAll();
      return res.json({ success: true, wanted: items });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message });
    }
  },

  async create(req: AuthRequest, res: Response) {
    try {
      const { suspect_name, charges, reward, status, officer_in_charge, image } = req.body;
      if (!suspect_name || !charges) {
        return res.status(400).json({ success: false, message: 'Suspect name and charges are required.' });
      }

      const id = await wantedModel.create({
        suspect_name,
        charges,
        reward: reward ? parseFloat(reward) : 0,
        status: status || 'active',
        officer_in_charge,
        image,
      });

      realtimeService.broadcast('WANTED_UPDATED', { id, action: 'create' });

      return res.status(201).json({ success: true, id, message: 'Wanted notice created successfully.' });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message });
    }
  },

  async updateStatus(req: AuthRequest, res: Response) {
    try {
      const id = parseInt(req.params.id);
      const { status } = req.body;

      const updated = await wantedModel.updateStatus(id, status);
      if (!updated) {
        return res.status(404).json({ success: false, message: 'Wanted notice not found' });
      }

      realtimeService.broadcast('WANTED_UPDATED', { id, action: 'update_status' });

      return res.json({ success: true, message: 'Wanted status updated successfully' });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message });
    }
  },

  async delete(req: AuthRequest, res: Response) {
    try {
      const id = parseInt(req.params.id);
      const deleted = await wantedModel.delete(id);
      if (!deleted) {
        return res.status(404).json({ success: false, message: 'Wanted notice not found' });
      }

      realtimeService.broadcast('WANTED_UPDATED', { id, action: 'delete' });

      return res.json({ success: true, message: 'Wanted notice deleted successfully' });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message });
    }
  },
};
