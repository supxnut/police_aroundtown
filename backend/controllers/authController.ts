import { Request, Response } from 'express';
import { authService } from '../services/authService';
import { AuthRequest } from '../middleware/auth';
import { config } from '../config/config';
import { userModel } from '../models/userModel';

export const authController = {
  async getDiscordOAuthUrl(req: Request, res: Response) {
    const clientId = process.env.DISCORD_CLIENT_ID;
    const appUrl = process.env.APP_URL || `${req.protocol}://${req.get('host')}`;
    const redirectUri = `${appUrl}/api/auth/discord/oauth-redirect`;

    if (!clientId) {
      return res.json({
        success: false,
        configured: false,
        message: 'กรุณาตั้งค่า DISCORD_CLIENT_ID และ DISCORD_CLIENT_SECRET ในระบบ'
      });
    }

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'identify email'
    });

    const url = `https://discord.com/api/oauth2/authorize?${params.toString()}`;
    return res.json({
      success: true,
      configured: true,
      url
    });
  },

  async discordOAuthRedirect(req: Request, res: Response) {
    try {
      const code = req.query.code as string;
      if (!code) {
        return res.status(400).send('<h1>ไม่พบ OAuth Code จาก Discord</h1>');
      }

      const clientId = process.env.DISCORD_CLIENT_ID;
      const clientSecret = process.env.DISCORD_CLIENT_SECRET;
      const appUrl = process.env.APP_URL || `${req.protocol}://${req.get('host')}`;
      const redirectUri = `${appUrl}/api/auth/discord/oauth-redirect`;

      if (!clientId || !clientSecret) {
        return res.status(500).send('<h1>ยังไม่ได้ตั้งค่า DISCORD_CLIENT_ID หรือ DISCORD_CLIENT_SECRET</h1>');
      }

      // Exchange code for token
      const tokenResponse = await fetch('https://discord.com/api/v10/oauth2/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          grant_type: 'authorization_code',
          code: code,
          redirect_uri: redirectUri,
        }),
      });

      const tokenData = await tokenResponse.json();
      if (!tokenData.access_token) {
        return res.status(400).send(`<h1>การแลก Token ไม่สำเร็จ: ${tokenData.error_description || 'Unknown error'}</h1>`);
      }

      // Fetch user profile from Discord
      const userResponse = await fetch('https://discord.com/api/v10/users/@me', {
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`,
        },
      });

      const discordUser = await userResponse.json();
      if (!discordUser.id) {
        return res.status(400).send('<h1>ไม่สามารถดึงข้อมูล Discord User ได้</h1>');
      }

      const avatarUrl = discordUser.avatar
        ? `https://cdn.discordapp.com/avatars/${discordUser.id}/${discordUser.avatar}.png`
        : 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150';

      const username = discordUser.global_name || discordUser.username;

      const { token, isAdmin } = await authService.handleDiscordLogin(discordUser.id, username, avatarUrl);

      res.cookie('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      // Send HTML script to set token in localStorage and redirect
      return res.send(`
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <title>Discord Auth Success</title>
          </head>
          <body style="background-color: #0f172a; color: #f8fafc; font-family: sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0;">
            <div style="text-align: center; background: #1e293b; padding: 2rem; border-radius: 1rem; border: 1px solid #334155;">
              <h2 style="color: #38bdf8;">เข้าสู่ระบบด้วย Discord สำเร็จ!</h2>
              <p>กำลังนำคุณไปยังหน้าแดชบอร์ด...</p>
            </div>
            <script>
              localStorage.setItem('auth_token', '${token}');
              if (window.opener) {
                window.opener.postMessage({ type: 'DISCORD_AUTH_SUCCESS', token: '${token}' }, '*');
                window.close();
              } else {
                window.location.href = '${isAdmin ? '/admin/dashboard' : '/police/dashboard'}';
              }
            </script>
          </body>
        </html>
      `);
    } catch (error: any) {
      return res.status(500).send(`<h1>เกิดข้อผิดพลาดในการเข้าสู่ระบบ: ${error.message}</h1>`);
    }
  },

  async discordCallback(req: Request, res: Response) {
    try {
      const { discord_id, username, avatar } = req.body;
      if (!discord_id) {
        return res.status(400).json({ success: false, message: 'กรุณากรอก Discord ID' });
      }

      const { token, user, isAdmin } = await authService.handleDiscordLogin(discord_id, username, avatar);

      res.cookie('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      return res.json({
        success: true,
        token,
        user,
        isAdmin,
      });
    } catch (error: any) {
      return res.status(401).json({
        success: false,
        message: error.message || 'คุณไม่มีสิทธิ์เข้าถึงระบบนี้',
      });
    }
  },

  async me(req: AuthRequest, res: Response) {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Not authenticated' });
    }
    const isAdmin = config.adminDiscordIds.includes(req.user.discord_id) || req.user.isAdmin === true;
    return res.json({
      success: true,
      user: {
        ...req.user,
        isAdmin,
      },
    });
  },

  async logout(req: Request, res: Response) {
    res.clearCookie('token');
    return res.json({ success: true, message: 'Logged out successfully' });
  },

  async systemStatus(req: Request, res: Response) {
    try {
      const count = await userModel.countAll();
      return res.json({ success: true, hasUsers: count > 0, count });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message });
    }
  },

  // Direct quick dev login endpoint for easy switching between Police and Admin IDs in testing mode
  async devLogin(req: Request, res: Response) {
    try {
      const { discord_id } = req.body;
      if (!discord_id) {
        return res.status(400).json({ success: false, message: 'Discord ID is required' });
      }

      const { token, user, isAdmin } = await authService.handleDiscordLogin(discord_id);

      res.cookie('token', token, {
        httpOnly: true,
        secure: false,
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      return res.json({
        success: true,
        token,
        user,
        isAdmin,
      });
    } catch (error: any) {
      return res.status(401).json({
        success: false,
        message: error.message || 'You do not have permission to access this system.',
      });
    }
  }
};
