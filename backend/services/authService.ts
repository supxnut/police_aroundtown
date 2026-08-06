import jwt from 'jsonwebtoken';
import { config } from '../config/config';
import { userModel, UserRow } from '../models/userModel';

export const authService = {
  async handleDiscordLogin(discordId: string, username?: string, avatar?: string): Promise<{ token: string; user: UserRow; isAdmin: boolean }> {
    let user = await userModel.findByDiscordId(discordId);

    const isAdmin = config.adminDiscordIds.includes(discordId);

    // If user does not exist in database and is not in admin env list, reject login
    if (!user && !isAdmin) {
      throw new Error('คุณไม่มีสิทธิ์ในการเข้าถึงระบบนี้ (You do not have permission to access this system.)');
    }

    // If user does not exist in database but is listed in admin env list, create admin record
    if (!user && isAdmin) {
      const today = new Date().toISOString().split('T')[0];
      const avatarUrl = avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150';

      const insertId = await userModel.create({
        discord_id: discordId,
        fullname: username || `Admin (${discordId.slice(-4)})`,
        rank: 'Chief of Police',
        start_date: today,
        avatar: avatarUrl,
        active: 1
      });

      user = await userModel.findById(insertId);
    }

    if (!user) {
      throw new Error('คุณไม่มีสิทธิ์ในการเข้าถึงระบบนี้ (You do not have permission to access this system.)');
    }

    if (!user.active) {
      throw new Error('บัญชีของคุณถูกระงับการใช้งาน กรุณาติดต่อผู้บังคับบัญชา');
    }

    const isUserAdmin = isAdmin || user.rank === 'Chief of Police';

    const payload = {
      id: user.id,
      discord_id: user.discord_id,
      fullname: user.fullname,
      rank: user.rank,
      start_date: user.start_date,
      avatar: user.avatar,
      active: user.active,
      isAdmin: isUserAdmin,
    };

    const token = jwt.sign(payload, config.jwtSecret, { expiresIn: '7d' });

    return { token, user, isAdmin: isUserAdmin };
  },

  generateJwt(user: UserRow, isAdmin: boolean): string {
    return jwt.sign(
      {
        id: user.id,
        discord_id: user.discord_id,
        fullname: user.fullname,
        rank: user.rank,
        start_date: user.start_date,
        avatar: user.avatar,
        active: user.active,
        isAdmin,
      },
      config.jwtSecret,
      { expiresIn: '7d' }
    );
  }
};
