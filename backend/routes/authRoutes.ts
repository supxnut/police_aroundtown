import { Router } from 'express';
import { authController } from '../controllers/authController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

router.get('/discord/url', authController.getDiscordOAuthUrl);
router.get('/discord/oauth-redirect', authController.discordOAuthRedirect);
router.post('/discord/callback', authController.discordCallback);
router.get('/system-status', authController.systemStatus);
router.post('/dev-login', authController.devLogin);
router.get('/me', authenticateToken, authController.me);
router.post('/logout', authController.logout);

export default router;
