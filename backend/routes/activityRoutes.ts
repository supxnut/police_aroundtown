import { Router } from 'express';
import { activityController } from '../controllers/activityController';
import { authenticateToken, requireAdmin } from '../middleware/auth';
import { upload } from '../middleware/upload';

const router = Router();

router.use(authenticateToken);

// Officers view and join activities
router.get('/police', activityController.getPoliceActivities);
router.post('/:id/join', activityController.joinActivity);

// Admin management
router.get('/admin', requireAdmin, activityController.getAdminActivities);
router.get('/:id/participants', requireAdmin, activityController.getActivityParticipants);
router.get('/history', requireAdmin, activityController.getActivityHistory);
router.post('/', requireAdmin, upload.single('image'), activityController.createActivity);
router.put('/:id', requireAdmin, upload.single('image'), activityController.updateActivity);
router.delete('/:id', requireAdmin, activityController.deleteActivity);

export default router;
