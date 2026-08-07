import { Router } from 'express';
import { discordParserController } from '../controllers/discordParserController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// Allow authenticated users (officers & admins) or direct API calls to parse discord logs
router.post('/parse', discordParserController.parseLog);

export default router;
