import { Request, Response, NextFunction } from 'express';
import { HealthService } from '../services/health.service';

export class HealthController {
  static async check(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const health = await HealthService.getHealth();
      const statusCode = health.status === 'healthy' ? 200 : 503;

      res.status(statusCode).json({
        success: health.status === 'healthy',
        data: health,
      });
    } catch (error) {
      next(error);
    }
  }
}
