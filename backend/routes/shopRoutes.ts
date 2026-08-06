import { Router } from 'express';
import { shopController } from '../controllers/shopController';
import { authenticateToken, requireAdmin } from '../middleware/auth';
import { upload } from '../middleware/upload';

const router = Router();

router.use(authenticateToken);

// Officers view items
router.get('/', shopController.getAllItems);

// Admin management
router.post('/', requireAdmin, upload.single('shopImage'), shopController.createItem);
router.put('/:id', requireAdmin, upload.single('shopImage'), shopController.updateItem);
router.delete('/:id', requireAdmin, shopController.deleteItem);

export default router;
