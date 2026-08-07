import { Router } from 'express';
import { dbBackupController } from '../controllers/dbBackupController';
import { authenticateToken, requireAdmin } from '../middleware/auth';

const router = Router();

router.use(authenticateToken, requireAdmin);
router.get('/export', dbBackupController.exportBackup);
router.post('/import', dbBackupController.importBackup);

export default router;
