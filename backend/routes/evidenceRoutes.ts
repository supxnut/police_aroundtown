import { Router } from 'express';
import { evidenceController } from '../controllers/evidenceController';
import { verifyApiKeyOrAuth } from '../middleware/auth';

const router = Router();

router.use(verifyApiKeyOrAuth);
router.get('/', evidenceController.getAll);
router.post('/', evidenceController.create);
router.delete('/:id', evidenceController.delete);

export default router;
