import { Router } from 'express';
import { caseController } from '../controllers/caseController';
import { authenticateToken, requireAdmin, verifyApiKeyOrAuth } from '../middleware/auth';

const router = Router();

// Public / Bot / Auth routes with x-api-key or Session token
router.post('/sync', verifyApiKeyOrAuth, caseController.createCase);
router.post('/', verifyApiKeyOrAuth, caseController.createCase);
router.get('/', verifyApiKeyOrAuth, caseController.getAllCases);
router.get('/officer-stats', verifyApiKeyOrAuth, caseController.getOfficerStats);
router.get('/officer-stats/:discordId', verifyApiKeyOrAuth, caseController.getOfficerStats);

// Admin-only management routes
router.get('/export', authenticateToken, requireAdmin, caseController.exportCsv);
router.put('/:id', authenticateToken, requireAdmin, caseController.updateCase);
router.delete('/:id', authenticateToken, requireAdmin, caseController.deleteCase);

export default router;
