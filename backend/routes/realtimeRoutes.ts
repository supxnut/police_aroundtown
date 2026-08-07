import { Router, Request, Response } from 'express';
import { realtimeService } from '../services/realtimeService';

const router = Router();

router.get('/stream', (req: Request, res: Response) => {
  realtimeService.addClient(res);
});

export default router;
