import { Router } from 'express';
import { userController } from '../controllers/userController';
import { authenticateToken, requireAdmin } from '../middleware/auth';
import { upload } from '../middleware/upload';

const router = Router();

// All user management routes require admin privileges
router.use(authenticateToken, requireAdmin);

router.get('/', userController.getAllUsers);
router.post('/', upload.single('avatar'), userController.createUser);
router.put('/:id', upload.single('avatar'), userController.updateUser);
router.delete('/:id', userController.deleteUser);

export default router;
