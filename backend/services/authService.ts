import jwt from 'jsonwebtoken';
import { config } from '../config/config';
import { userModel, UserRow } from '../models/userModel';

export const authService = {
  async handleDiscordLogin(discordId: string, username?: string, avatar?: string): Promise<{ token: string; user: UserRow; isAdmin: boolean }> {
    console.log(`[Auth Service] Verifying authorization for Discord ID: ${discordId}`);
    let user = await userModel.findByDiscordId(discordId);

    const totalUsers = await userModel.countAll();
    const isEnvAdmin = config.adminDiscordIds.includes(discordId);

    // If no user exists in database at all, grant initial admin to the first logging in Discord account
    const isFirstUser = totalUsers === 0;
    const isAdmin = isEnvAdmin || isFirstUser;

    // If user does not exist in database and is not an admin, reject login
    if (!user && !isAdmin) {
      console.warn(`[Auth Service] Authorization failed: Discord ID ${discordId} not found in database and not in DISCORD_ADMIN_IDS`);
      throw new Error('คุณไม่มีสิทธิ์ในการเข้าถึงระบบนี้ (ไม่พบ Discord ID ในระบบ)');
    }

    // If user does not exist in database but is an admin, create admin record
    if (!user && isAdmin) {
      console.log(`[Auth Service] Auto-creating admin user record for Discord ID: ${discordId}`);
      const today = new Date().toISOString().split('T')[0];
      const avatarUrl = avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150';

      const insertId = await userModel.create({
        discord_id: discordId,
        fullname: username || `Chief Admin (${discordId.slice(-4)})`,
        rank: 'Chief of Police',
        start_date: today,
        avatar: avatarUrl,
        active: 1
      });

      user = await userModel.findById(insertId);
    }

    if (!user) {
      throw new Error('คุณไม่มีสิทธิ์ในการเข้าถึงระบบนี้ (ไม่พบข้อมูลผู้ใช้งาน)');
    }

    // If user exists and avatar is provided via Discord OAuth, update avatar
    if (user && avatar && user.avatar !== avatar) {
      await userModel.update(user.id, { avatar });
      user.avatar = avatar;
    }

    if (!user.active) {
      console.warn(`[Auth Service] Login blocked: User ${user.fullname} (${discordId}) is inactive`);
      throw new Error('บัญชีของคุณถูกระงับการใช้งาน กรุณาติดต่อผู้บังคับบัญชา');
    }

    const isUserAdmin = isAdmin || user.rank === 'Chief of Police' || isEnvAdmin;
    console.log(`[Auth Service] Login authorized for ${user.fullname} (${user.discord_id}), isAdmin: ${isUserAdmin}`);

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
