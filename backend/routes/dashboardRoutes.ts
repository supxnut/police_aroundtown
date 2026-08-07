import { Router } from 'express';
import { dashboardController } from '../controllers/dashboardController';
import { verifyApiKeyOrAuth } from '../middleware/auth';

const router = Router();

router.use(verifyApiKeyOrAuth);
router.get('/', dashboardController.getDashboardData);
router.get('/:discordId', dashboardController.getOfficerDashboard);

export default router;
