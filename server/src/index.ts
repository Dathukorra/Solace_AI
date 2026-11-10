import dns from 'dns';
dns.setDefaultResultOrder('ipv4first');

import app from './app';
import { env } from './lib/env';
import { logger } from './lib/logger';
import { prisma } from './lib/prisma';
import {
  startReminderScheduler,
  stopReminderScheduler,
} from './services/reminderScheduler.service';

const server = app.listen(env.PORT, () => {
  logger.info(`🚀 Solace AI Server running on port ${env.PORT}`);
  logger.info(`🌿 Environment: ${env.NODE_ENV}`);
  logger.info(`🩺 Health check: http://localhost:${env.PORT}/health`);
  logger.info(`✨ API endpoints: http://localhost:${env.PORT}/api`);

  // Start minute-by-minute push notification scheduler in background
  if (env.NODE_ENV !== 'test') {
    startReminderScheduler();
  }
});

// Graceful shutdown handling
const shutdown = async (signal: string) => {
  logger.info(`${signal} received. Closing HTTP server and database connections...`);

  // Stop background cron jobs
  stopReminderScheduler();

  server.close(async () => {
    logger.info('HTTP server closed.');

    try {
      await prisma.$disconnect();
      logger.info('Prisma disconnected successfully.');
      process.exit(0);
    } catch (err) {
      logger.error('Error during Prisma disconnect:', err);
      process.exit(1);
    }
  });

  // Force shutdown if taking longer than 10 seconds
  setTimeout(() => {
    logger.error('Forcefully terminating process after timeout.');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

process.on('unhandledRejection', (reason: unknown) => {
  logger.error('Unhandled Rejection at Promise:', reason);
});

process.on('uncaughtException', (error: Error) => {
  logger.error('Uncaught Exception thrown:', error);
  process.exit(1);
});
