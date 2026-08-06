import { Router } from 'express';
import { caseReportController } from '../controllers/caseReportController';
import { authenticateToken, requireAdmin } from '../middleware/auth';

const router = Router();

// Strictly require JWT authentication AND Admin role check
router.use(authenticateToken);
router.use(requireAdmin);

router.get('/', caseReportController.getCaseReport);
router.get('/export', caseReportController.exportCsv);

export default router;
