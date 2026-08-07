import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { userModel } from '../models/userModel';
import { dutyModel } from '../models/dutyModel';
import { logAdminAction } from '../services/logService';

export const userController = {
  async getAllUsers(req: AuthRequest, res: Response) {
    try {
      const users = await userModel.getAll();
      return res.json({ success: true, users });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message });
    }
  },

  async createUser(req: AuthRequest, res: Response) {
    try {
      const { discord_id, fullname, rank, start_date, total_hours, total_cases } = req.body;
      if (!discord_id || !fullname || !rank || !start_date) {
        return res.status(400).json({ success: false, message: 'All fields (Discord ID, Full Name, Rank, Start Date) are required' });
      }

      const existing = await userModel.findByDiscordId(discord_id);
      if (existing) {
        return res.status(400).json({ success: false, message: 'User with this Discord ID already exists' });
      }

      let avatar = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150';
      if (req.file) {
        avatar = `/uploads/avatars/${req.file.filename}`;
      }

      const userId = await userModel.create({
        discord_id,
        fullname,
        rank,
        start_date,
        avatar,
        total_hours: total_hours !== undefined ? parseFloat(total_hours) : 0,
        total_cases: total_cases !== undefined ? parseInt(total_cases) : 0,
      });

      if (req.user) {
        await logAdminAction(req.user.discord_id, `Created user ${fullname} (${rank})`, fullname);
      }

      return res.status(201).json({ success: true, userId, message: 'User created successfully' });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message });
    }
  },

  async updateUser(req: AuthRequest, res: Response) {
    try {
      const id = parseInt(req.params.id);
      const { discord_id, fullname, rank, start_date, active, total_hours, total_cases } = req.body;

      let avatar: string | undefined = undefined;
      if (req.file) {
        avatar = `/uploads/avatars/${req.file.filename}`;
      }

      const updated = await userModel.update(id, {
        discord_id,
        fullname,
        rank,
        start_date,
        active: active !== undefined ? Number(active) : undefined,
        avatar,
        total_hours: total_hours !== undefined ? parseFloat(total_hours) : undefined,
        total_cases: total_cases !== undefined ? parseInt(total_cases) : undefined,
      });
      if (!updated) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }

      if (req.user) {
        await logAdminAction(req.user.discord_id, `Updated user details/stats for ID ${id}`, fullname || `User #${id}`);
      }

      return res.json({ success: true, message: 'User updated successfully' });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message });
    }
  },

  async deleteUser(req: AuthRequest, res: Response) {
    try {
      const id = parseInt(req.params.id);
      const targetUser = await userModel.findById(id);

      const deleted = await userModel.delete(id);
      if (!deleted) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }

      if (req.user) {
        await logAdminAction(req.user.discord_id, `Deleted user ID ${id}`, targetUser ? targetUser.fullname : `User #${id}`);
      }

      return res.json({ success: true, message: 'User deleted successfully' });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message });
    }
  },

  async exportCsv(req: AuthRequest, res: Response) {
    try {
      const users = await userModel.getAll();
      const dutyLogs = await dutyModel.getAll();

      // Calculate qualified work days (days with >= 3 hours duty)
      const userQualifiedDays: Record<number, number> = {};
      users.forEach(u => {
        const hoursPerDay: Record<string, number> = {};
        dutyLogs.filter(l => l.user_id === u.id).forEach(l => {
          if (!l.date) return;
          const dateKey = l.date.substring(0, 10);
          const hrs = parseFloat(l.hours as any) || 0;
          hoursPerDay[dateKey] = (hoursPerDay[dateKey] || 0) + hrs;
        });
        userQualifiedDays[u.id] = Object.values(hoursPerDay).filter(hrs => hrs >= 3).length;
      });

      let csv = 'ID,ชื่อ-นามสกุล,Discord ID,ยศตำแหน่ง,วันที่เริ่มงาน,วันทำงานสะสม (>=3ชม.),ชั่วโมงรวม,เคสรวม,สถานะบัญชี\n';
      users.forEach(u => {
        const daysWorked = userQualifiedDays[u.id] || 0;
        const statusStr = u.active ? 'ใช้งานปกติ' : 'ระงับสิทธิ์';
        const cleanName = (u.fullname || '').replace(/"/g, '""');
        const cleanRank = (u.rank || '').replace(/"/g, '""');
        csv += `"${u.id}","${cleanName}","${u.discord_id || ''}","${cleanRank}","${u.start_date || ''}","${daysWorked}","${u.total_hours || 0}","${u.total_cases || 0}","${statusStr}"\n`;
      });

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="officers_list.csv"');
      return res.send('\uFEFF' + csv);
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message });
    }
  }
};
