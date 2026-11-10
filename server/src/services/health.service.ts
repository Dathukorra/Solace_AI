import { env } from '../lib/env';
import { prisma } from '../lib/prisma';
import { AIProvider, getAIProvider } from './ai.service';

export interface HealthStatus {
  status: 'healthy' | 'unhealthy';
  uptime: number;
  timestamp: string;
  environment: string;
  services: {
    database: 'connected' | 'disconnected' | 'unknown';
    ai: AIProvider;
  };
  memoryUsage: NodeJS.MemoryUsage;
}

export class HealthService {
  static async getHealth(): Promise<HealthStatus> {
    let databaseStatus: 'connected' | 'disconnected' | 'unknown' = 'unknown';

    try {
      // Simple raw query or count to verify DB connection
      await prisma.$queryRaw`SELECT 1`;
      databaseStatus = 'connected';
    } catch {
      databaseStatus = 'disconnected';
    }

    return {
      status: databaseStatus === 'connected' ? 'healthy' : 'unhealthy',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      environment: env.NODE_ENV,
      services: {
        database: databaseStatus,
        ai: getAIProvider(),
      },
      memoryUsage: process.memoryUsage(),
    };
  }
}
