import { Router } from 'express';
import { logController } from '../controllers/logController';
import { authenticateToken, requireAdmin } from '../middleware/auth';

const router = Router();

router.use(authenticateToken, requireAdmin);
router.get('/', logController.getAdminLogs);
router.get('/discord', logController.getDiscordLogs);
router.get('/export', logController.exportCsv);

export default router;
