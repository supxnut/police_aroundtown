import { Router } from 'express';
import { notificationController } from '../controllers/notificationController';
import { authenticateToken, requireAdmin } from '../middleware/auth';

const router = Router();

router.use(authenticateToken);
router.get('/', notificationController.getNotifications);
router.post('/', requireAdmin, notificationController.createAnnouncement);

export default router;
