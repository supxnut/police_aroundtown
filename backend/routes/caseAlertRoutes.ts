import { Router } from 'express';
import { caseAlertController } from '../controllers/caseAlertController';
import { authenticateToken, requireAdmin } from '../middleware/auth';

const router = Router();

// All routes require JWT token & Admin privileges
router.use(authenticateToken);
router.use(requireAdmin);

router.get('/count', caseAlertController.getPendingCount);
router.get('/', caseAlertController.getAlerts);
router.patch('/:id/review', caseAlertController.markAsReviewed);

export default router;
