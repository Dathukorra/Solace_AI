import express, { Application } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { mkdirSync } from 'fs';
import path from 'path';
import { env } from './lib/env';
import { requestLogger } from './middleware/requestLogger';
import { errorHandler } from './middleware/errorHandler';
import { notFoundHandler } from './middleware/notFoundHandler';
import apiRouter from './routes';
import healthRoutes from './routes/health.routes';
import conversationRoutes from './routes/conversation.routes';
import memoryRoutes from './routes/memory.routes';
import meRoutes from './routes/me.routes';
import moodsRoutes from './routes/moods.routes';
import progressRoutes from './routes/progress.routes';
import homeRoutes from './routes/home.routes';
import activityRoutes from './routes/activity.routes';
import reminderRoutes from './routes/reminder.routes';
import pushTokenRoutes from './routes/pushToken.routes';

const app: Application = express();

// Locally stored profile pictures (no cloud storage provider configured).
const uploadsDir = path.resolve(process.cwd(), 'uploads');
mkdirSync(path.join(uploadsDir, 'avatars'), { recursive: true });

// Security headers with Helmet
app.use(helmet());

// Cross-Origin Resource Sharing
app.use(
  cors({
    origin: env.CORS_ORIGIN === '*' ? true : env.CORS_ORIGIN.split(','),
    credentials: true,
  })
);

// Body parsers. Avatars arrive as base64 data URLs during profile saves.
app.use(express.json({ limit: '4mb' }));
app.use(express.urlencoded({ extended: true, limit: '4mb' }));

// Serve uploaded profile pictures to the app and web client.
app.use(
  '/uploads',
  express.static(uploadsDir, {
    maxAge: '1h',
    setHeaders: (res) => {
      res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    },
  })
);

// Request logging middleware
app.use(requestLogger);

// Direct top-level health check endpoint
app.use('/health', healthRoutes);

// Direct top-level resource routes
app.use('/conversations', conversationRoutes);
app.use('/memories', memoryRoutes);
app.use('/me', meRoutes);
app.use('/moods', moodsRoutes);
app.use('/progress', progressRoutes);
app.use('/home', homeRoutes);
app.use('/activities', activityRoutes);
app.use('/reminders', reminderRoutes);
app.use('/push-tokens', pushTokenRoutes);

// API router mounted under /api
app.use('/api', apiRouter);

// 404 handler for undefined routes
app.use(notFoundHandler);

// Global error handling middleware (must be registered last)
app.use(errorHandler);

export default app;
