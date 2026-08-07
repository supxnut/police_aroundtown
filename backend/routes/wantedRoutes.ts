import { Router } from 'express';
import { wantedController } from '../controllers/wantedController';

const router = Router();

router.get('/', wantedController.getAll);
router.post('/', wantedController.create);
router.patch('/:id/status', wantedController.updateStatus);
router.delete('/:id', wantedController.delete);

export default router;
