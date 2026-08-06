import { Router } from 'express';
import { caseController } from '../controllers/caseController';
import { authenticateToken, requireAdmin } from '../middleware/auth';

const router = Router();

router.use(authenticateToken);

// Officers can view cases
router.get('/', caseController.getAllCases);
router.get('/export', requireAdmin, caseController.exportCsv);

// Admin can manage cases
router.post('/', requireAdmin, caseController.createCase);
router.put('/:id', requireAdmin, caseController.updateCase);
router.delete('/:id', requireAdmin, caseController.deleteCase);

export default router;
