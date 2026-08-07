import { Router } from 'express';
import { discordParserController } from '../controllers/discordParserController';
import { verifyApiKeyOrAuth } from '../middleware/auth';
import { syncDiscordCases } from '../../discordLogSync.server';

const router = Router();

// Allow authenticated users (officers & admins) or direct API calls to parse discord logs
router.post('/parse', verifyApiKeyOrAuth, discordParserController.parseLog);

// Force sync with Discord Log channel
router.post('/sync', async (_req, res) => {
  try {
    const success = await syncDiscordCases(true);
    return res.json({ success, message: 'Discord log sync completed successfully' });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message || 'Sync failed' });
  }
});

export default router;
