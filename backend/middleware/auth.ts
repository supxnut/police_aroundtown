import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/config';
import { userModel } from '../models/userModel';

export interface AuthRequest extends Request {
  user?: {
    id: number;
    discord_id: string;
    fullname: string;
    rank: string;
    start_date: string;
    avatar: string;
    active: number;
    isAdmin: boolean;
  };
}

export const authenticateToken = async (req: AuthRequest, res: Response, next: NextFunction) => {
  let token = req.cookies?.token;

  if (!token && req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    res.clearCookie('token');
    return res.status(401).json({ success: false, message: 'Authentication required' });
  }

  try {
    const decoded = jwt.verify(token, config.jwtSecret) as any;
    const discordId = decoded?.discord_id;

    if (!discordId) {
      res.clearCookie('token');
      return res.status(401).json({ success: false, message: 'Invalid session structure' });
    }

    // ALWAYS query Personnel/User directly from Database on EVERY request
    const dbUser = await userModel.findByDiscordId(discordId);

    // If not found in database or account is inactive -> Destroy session, clear cookie, logout
    if (!dbUser || dbUser.active === 0) {
      console.warn(`[Auth Middleware] Unauthorized access attempt: Discord ID ${discordId} not found in personnel or inactive.`);
      res.clearCookie('token');
      return res.status(401).json({
        success: false,
        message: 'คุณถูกลบออกจากรายชื่อบุคลากร หรือบัญชีของคุณถูกระงับ',
        forceLogout: true,
      });
    }

    // Evaluate latest Rank, Role, and Admin permissions from DB fresh every request
    const isEnvAdmin = config.adminDiscordIds.includes(dbUser.discord_id);
    const isAdmin = isEnvAdmin || dbUser.rank === 'Chief of Police';

    req.user = {
      id: dbUser.id,
      discord_id: dbUser.discord_id,
      fullname: dbUser.fullname,
      rank: dbUser.rank,
      start_date: dbUser.start_date,
      avatar: dbUser.avatar,
      active: dbUser.active,
      isAdmin,
    };

    next();
  } catch (err) {
    res.clearCookie('token');
    return res.status(401).json({ success: false, message: 'Invalid or expired session token' });
  }
};

export const requireAdmin = async (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.user) {
    res.clearCookie('token');
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }

  // Re-verify Personnel from DB
  const dbUser = await userModel.findByDiscordId(req.user.discord_id);
  if (!dbUser || dbUser.active === 0) {
    res.clearCookie('token');
    return res.status(401).json({ success: false, message: 'Personnel account not found or inactive' });
  }

  const isEnvAdmin = config.adminDiscordIds.includes(dbUser.discord_id);
  const isAdmin = isEnvAdmin || dbUser.rank === 'Chief of Police';

  if (!isAdmin) {
    return res.status(403).json({ success: false, message: 'Forbidden: Admin access required' });
  }

  // Ensure req.user holds the latest DB state
  req.user.fullname = dbUser.fullname;
  req.user.rank = dbUser.rank;
  req.user.active = dbUser.active;
  req.user.isAdmin = isAdmin;

  next();
};

export const verifyApiKey = (req: Request, res: Response, next: NextFunction) => {
  const apiKey = (req.headers['x-api-key'] || req.headers['x-bot-api-key']) as string | undefined;
  const expectedKey = process.env.API_KEY || process.env.BOT_API_KEY || 'aroundtown_police_bot_secret_key_2026';

  if (!apiKey || apiKey !== expectedKey) {
    return res.status(401).json({ success: false, message: '401 Unauthorized: Invalid or missing x-api-key' });
  }

  next();
};

export const verifyApiKeyOrAuth = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const apiKey = (req.headers['x-api-key'] || req.headers['x-bot-api-key']) as string | undefined;
  const expectedKey = process.env.API_KEY || process.env.BOT_API_KEY || 'aroundtown_police_bot_secret_key_2026';

  if (apiKey) {
    if (apiKey === expectedKey) {
      return next();
    } else {
      return res.status(401).json({ success: false, message: '401 Unauthorized: Invalid x-api-key' });
    }
  }

  return authenticateToken(req, res, next);
};
