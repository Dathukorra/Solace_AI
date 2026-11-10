import { Request, Response, NextFunction } from 'express';
import { MoodService } from '../services/mood.service';

export class MoodController {
  static async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { mood, note, emotions, tags } = req.body;
      const userId = req.user?.id || 'demo_user_id';

      const entry = await MoodService.createEntry({
        userId,
        mood,
        note,
        emotions: emotions || tags || [],
      });

      res.status(201).json({
        success: true,
        data: entry,
      });
    } catch (error) {
      next(error);
    }
  }

  static async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.id || 'demo_user_id';
      const entries = await MoodService.getEntries(userId);

      res.status(200).json({
        success: true,
        data: entries,
      });
    } catch (error) {
      next(error);
    }
  }
}
