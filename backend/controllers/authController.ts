import { Request, Response } from 'express';
import { authService } from '../services/authService';
import { AuthRequest } from '../middleware/auth';
import { config } from '../config/config';
import { userModel } from '../models/userModel';

const getAppUrl = (req: Request): string => {
  if (process.env.APP_URL) {
    return process.env.APP_URL.replace(/\/$/, '');
  }
  const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'http';
  const host = req.get('host') || 'localhost:3000';
  return `${protocol}://${host}`;
};

const getRedirectUri = (req: Request): string => {
  if (process.env.DISCORD_REDIRECT_URI) {
    return process.env.DISCORD_REDIRECT_URI;
  }
  const appUrl = process.env.APP_URL
    ? process.env.APP_URL.replace(/\/$/, '')
    : getAppUrl(req);
  return `${appUrl}/api/auth/discord/callback`;
};

const isSecureConnection = (req: Request): boolean => {
  if (process.env.NODE_ENV === 'production') return true;
  const appUrl = getAppUrl(req);
  return appUrl.startsWith('https://');
};

export const authController = {
  async getDiscordOAuthUrl(req: Request, res: Response) {
    const clientId = process.env.DISCORD_CLIENT_ID || config.discord.clientId;
    const redirectUri = getRedirectUri(req);

    console.log("APP_URL =", process.env.APP_URL);
    console.log("DISCORD_REDIRECT_URI =", process.env.DISCORD_REDIRECT_URI);
    console.log("OAuth Redirect URI =", redirectUri);
    console.log(`[Discord OAuth] Requesting OAuth URL - Client ID: ${clientId ? 'Present' : 'Missing'}, Redirect URI: ${redirectUri}`);

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
      url,
      redirectUri
    });
  },

  async handleOAuthCodeExchange(req: Request, res: Response) {
    try {
      const code = (req.query.code || req.body.code) as string;
      console.log(`[Discord OAuth Callback] Processing callback, received code: ${code ? 'Yes' : 'No'}`);

      if (!code) {
        return res.status(400).send('<h1>ไม่พบ OAuth Code จาก Discord</h1>');
      }

      const clientId = process.env.DISCORD_CLIENT_ID || config.discord.clientId;
      const clientSecret = process.env.DISCORD_CLIENT_SECRET || config.discord.clientSecret;
      const redirectUri = getRedirectUri(req);

      if (!clientId || !clientSecret) {
        console.error('[Discord OAuth Callback] Missing DISCORD_CLIENT_ID or DISCORD_CLIENT_SECRET');
        return res.status(500).send('<h1>ยังไม่ได้ตั้งค่า DISCORD_CLIENT_ID หรือ DISCORD_CLIENT_SECRET ในระบบ</h1>');
      }

      console.log(`[Discord OAuth Callback] Exchanging code for token with Redirect URI: ${redirectUri}`);

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
        console.error('[Discord OAuth Callback] Token exchange failed:', tokenData);
        return res.status(400).send(`<h1>การแลก Token ไม่สำเร็จ: ${tokenData.error_description || tokenData.error || 'Unknown error'}</h1>`);
      }

      console.log('[Discord OAuth Callback] Token exchange successful, fetching user profile...');

      // Fetch user profile from Discord
      const userResponse = await fetch('https://discord.com/api/v10/users/@me', {
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`,
        },
      });

      const discordUser = await userResponse.json();
      if (!discordUser.id) {
        console.error('[Discord OAuth Callback] Failed to fetch Discord user:', discordUser);
        return res.status(400).send('<h1>ไม่สามารถดึงข้อมูล Discord User ได้</h1>');
      }

      console.log(`[Discord OAuth Callback] Discord user retrieved: ${discordUser.username} (${discordUser.id})`);

      const avatarUrl = discordUser.avatar
        ? `https://cdn.discordapp.com/avatars/${discordUser.id}/${discordUser.avatar}.png`
        : 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150';

      const username = discordUser.global_name || discordUser.username;

      const { token, user, isAdmin } = await authService.handleDiscordLogin(discordUser.id, username, avatarUrl);

      const secureCookie = isSecureConnection(req);
      console.log(`[Discord Session] Creating session cookie for user ${user.fullname}, secure=${secureCookie}`);

      res.cookie('token', token, {
        httpOnly: true,
        secure: secureCookie,
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      const redirectPath = isAdmin ? '/admin/dashboard' : '/police/dashboard';

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
                window.location.href = '${redirectPath}';
              }
            </script>
          </body>
        </html>
      `);
    } catch (error: any) {
      console.error('[Discord OAuth Callback Exception]:', error);
      return res.status(500).send(`<h1>เกิดข้อผิดพลาดในการเข้าสู่ระบบ: ${error.message}</h1>`);
    }
  },

  async discordOAuthRedirect(req: Request, res: Response) {
    return authController.handleOAuthCodeExchange(req, res);
  },

  async discordCallback(req: Request, res: Response) {
    // If request contains query param 'code', it's the OAuth callback from Discord redirect
    if (req.query.code || (req.body && req.body.code)) {
      return authController.handleOAuthCodeExchange(req, res);
    }

    try {
      const { discord_id, username, avatar } = req.body;
      if (!discord_id) {
        return res.status(400).json({ success: false, message: 'กรุณากรอก Discord ID' });
      }

      console.log(`[Discord Direct Login] Processing login for Discord ID: ${discord_id}`);

      const { token, user, isAdmin } = await authService.handleDiscordLogin(discord_id, username, avatar);

      const secureCookie = isSecureConnection(req);

      res.cookie('token', token, {
        httpOnly: true,
        secure: secureCookie,
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
      console.error('[Discord Direct Login Error]:', error.message);
      return res.status(401).json({
        success: false,
        message: error.message || 'คุณไม่มีสิทธิ์เข้าถึงระบบนี้',
      });
    }
  },

  async me(req: AuthRequest, res: Response) {
    if (!req.user) {
      res.clearCookie('token');
      return res.status(401).json({ success: false, message: 'Not authenticated' });
    }

    const dbUser = await userModel.findByDiscordId(req.user.discord_id);
    if (!dbUser || dbUser.active === 0) {
      res.clearCookie('token');
      return res.status(401).json({
        success: false,
        message: 'คุณถูกลบออกจากรายชื่อบุคลากร หรือบัญชีของคุณถูกระงับ',
        forceLogout: true,
      });
    }

    const isEnvAdmin = config.adminDiscordIds.includes(dbUser.discord_id);
    const isAdmin = isEnvAdmin || dbUser.rank === 'Chief of Police';

    return res.json({
      success: true,
      user: {
        id: dbUser.id,
        discord_id: dbUser.discord_id,
        fullname: dbUser.fullname,
        rank: dbUser.rank,
        start_date: dbUser.start_date,
        avatar: dbUser.avatar,
        active: dbUser.active,
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
