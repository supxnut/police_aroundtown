import { Router } from 'express';
import { dashboardController } from '../controllers/dashboardController';

const router = Router();

router.get('/', dashboardController.getDashboardData);

export default router;
