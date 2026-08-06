import { Router } from 'express';
import { dutyController } from '../controllers/dutyController';
import { authenticateToken, requireAdmin } from '../middleware/auth';

const router = Router();

router.use(authenticateToken);

// Officers can view their own duty logs
router.get('/my', dutyController.getMyDutyLogs);

// Admin duty management
router.get('/', requireAdmin, dutyController.getAllDutyLogs);
router.get('/export', requireAdmin, dutyController.exportCsv);
router.post('/', requireAdmin, dutyController.createDutyLog);
router.put('/:id', requireAdmin, dutyController.updateDutyLog);
router.delete('/:id', requireAdmin, dutyController.deleteDutyLog);

export default router;
