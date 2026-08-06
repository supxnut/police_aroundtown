import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: process.env.PORT || 3000,
  jwtSecret: process.env.JWT_SECRET || 'police_mdt_super_secret_jwt_key_2026_fivem',
  sessionSecret: process.env.SESSION_SECRET || 'police_mdt_session_secret_2026',
  discord: {
    clientId: process.env.DISCORD_CLIENT_ID || '123456789012345678',
    clientSecret: process.env.DISCORD_CLIENT_SECRET || '',
    redirectUri: process.env.DISCORD_REDIRECT_URI || 'http://localhost:3000/api/auth/discord/callback',
  },
  adminDiscordIds: (process.env.DISCORD_ADMIN_IDS || '100000000000000001,100000000000000002')
    .split(',')
    .map(id => id.trim())
    .filter(Boolean),
  db: {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'police_mdt',
  }
};
