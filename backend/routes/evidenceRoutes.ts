import { Router } from 'express';
import { evidenceController } from '../controllers/evidenceController';

const router = Router();

router.get('/', evidenceController.getAll);
router.post('/', evidenceController.create);
router.delete('/:id', evidenceController.delete);

export default router;
