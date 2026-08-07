import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { evidenceModel } from '../models/evidenceModel';
import { realtimeService } from '../services/realtimeService';

export const evidenceController = {
  async getAll(req: AuthRequest, res: Response) {
    try {
      const items = await evidenceModel.getAll();
      return res.json({ success: true, evidence: items });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message });
    }
  },

  async create(req: AuthRequest, res: Response) {
    try {
      const { case_number, title, description, items, image, officer_name } = req.body;
      if (!title) {
        return res.status(400).json({ success: false, message: 'Title is required for evidence.' });
      }

      const id = await evidenceModel.create({
        case_number,
        title,
        description,
        items,
        image,
        officer_name,
      });

      realtimeService.broadcast('EVIDENCE_UPDATED', { id, action: 'create' });

      return res.status(201).json({ success: true, id, message: 'Evidence created successfully.' });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message });
    }
  },

  async delete(req: AuthRequest, res: Response) {
    try {
      const id = parseInt(req.params.id);
      const deleted = await evidenceModel.delete(id);
      if (!deleted) {
        return res.status(404).json({ success: false, message: 'Evidence not found' });
      }

      realtimeService.broadcast('EVIDENCE_UPDATED', { id, action: 'delete' });

      return res.json({ success: true, message: 'Evidence deleted successfully' });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message });
    }
  },
};
