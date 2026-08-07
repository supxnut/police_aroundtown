import { Router } from 'express';
import { wantedController } from '../controllers/wantedController';
import { verifyApiKeyOrAuth } from '../middleware/auth';

const router = Router();

router.use(verifyApiKeyOrAuth);
router.get('/', wantedController.getAll);
router.post('/', wantedController.create);
router.patch('/:id/status', wantedController.updateStatus);
router.delete('/:id', wantedController.delete);

export default router;
