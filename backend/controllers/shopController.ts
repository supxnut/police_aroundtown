import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { shopModel } from '../models/shopModel';
import { logAdminAction } from '../services/logService';

export const shopController = {
  async getAllItems(req: AuthRequest, res: Response) {
    try {
      const items = await shopModel.getAll();
      return res.json({ success: true, items });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message });
    }
  },

  async createItem(req: AuthRequest, res: Response) {
    try {
      const { name, description, price, status } = req.body;
      if (!name || !description || price === undefined) {
        return res.status(400).json({ success: false, message: 'Name, description, and price are required' });
      }

      let image = 'https://images.unsplash.com/photo-1584438784894-089d6a62b8fa?w=600';
      if (req.file) {
        image = `/uploads/shop/${req.file.filename}`;
      }

      const id = await shopModel.create({
        name,
        description,
        price: parseFloat(price),
        image,
        status: status || 'available',
      });

      if (req.user) {
        await logAdminAction(req.user.discord_id, `Created shop item: ${name} ($${price})`, 'Shop Catalog');
      }

      return res.status(201).json({ success: true, id, message: 'Shop item created successfully' });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message });
    }
  },

  async updateItem(req: AuthRequest, res: Response) {
    try {
      const id = parseInt(req.params.id);
      const { name, description, price, status } = req.body;

      let image: string | undefined = undefined;
      if (req.file) {
        image = `/uploads/shop/${req.file.filename}`;
      }

      const updated = await shopModel.update(id, {
        name,
        description,
        price: price !== undefined ? parseFloat(price) : undefined,
        image,
        status: status as 'available' | 'out_of_stock',
      });

      if (!updated) {
        return res.status(404).json({ success: false, message: 'Shop item not found' });
      }

      if (req.user) {
        await logAdminAction(req.user.discord_id, `Updated shop item #${id}: ${name || 'Item'}`, 'Shop Catalog');
      }

      return res.json({ success: true, message: 'Shop item updated successfully' });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message });
    }
  },

  async deleteItem(req: AuthRequest, res: Response) {
    try {
      const id = parseInt(req.params.id);
      const deleted = await shopModel.delete(id);
      if (!deleted) {
        return res.status(404).json({ success: false, message: 'Shop item not found' });
      }

      if (req.user) {
        await logAdminAction(req.user.discord_id, `Deleted shop item #${id}`, `Item #${id}`);
      }

      return res.json({ success: true, message: 'Shop item deleted successfully' });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message });
    }
  }
};
