import express from 'express';
import path from 'path';
import cors from 'cors';
import cookieParser from 'cookie-parser';

import authRoutes from './routes/authRoutes';
import userRoutes from './routes/userRoutes';
import dutyRoutes from './routes/dutyRoutes';
import caseRoutes from './routes/caseRoutes';
import caseReportRoutes from './routes/caseReportRoutes';
import activityRoutes from './routes/activityRoutes';
import shopRoutes from './routes/shopRoutes';
import logRoutes from './routes/logRoutes';
import notificationRoutes from './routes/notificationRoutes';
import caseAlertRoutes from './routes/caseAlertRoutes';

export const createApp = () => {
  const app = express();

  app.use(cors({
    origin: true,
    credentials: true
  }));
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());

  // Static uploads directory
  const uploadsPath = path.join(process.cwd(), 'uploads');
  app.use('/uploads', express.static(uploadsPath));

  // Health check endpoint
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', service: 'Police MDT System API', timestamp: new Date().toISOString() });
  });

  // API Route mounting
  app.use('/api/auth', authRoutes);
  app.use('/api/users', userRoutes);
  app.use('/api/duty', dutyRoutes);
  app.use('/api/cases', caseRoutes);
  app.use('/api/case-report', caseReportRoutes);
  app.use('/api/activities', activityRoutes);
  app.use('/api/shop', shopRoutes);
  app.use('/api/logs', logRoutes);
  app.use('/api/notifications', notificationRoutes);
  app.use('/api/admin/case-alerts', caseAlertRoutes);

  return app;
};
