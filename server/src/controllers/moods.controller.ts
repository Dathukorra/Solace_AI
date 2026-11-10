import { Request, Response, NextFunction } from 'express';
import { AppError } from '../lib/errors';
import * as MoodsService from '../services/moods.service';

function getUserId(req: Request): string {
  if (!req.user?.id) {
    throw new AppError('Authentication required', 401);
  }
  return req.user.id;
}

export async function postMoodHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = getUserId(req);
    const { mood, emotions, note } = req.body;

    const result = await MoodsService.saveDailyMoodCheckin({
      userId,
      mood,
      emotions: emotions || [],
      note,
    });

    res.status(result.isUpdated ? 200 : 201).json({
      success: true,
      data: result.checkin,
      isUpdated: result.isUpdated,
      localDate: result.localDate,
    });
  } catch (error) {
    next(error);
  }
}

export async function getMoodsHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = getUserId(req);
    const range = req.query.range === '30d' ? '30d' : '7d';

    const result = await MoodsService.getMoodHistory({
      userId,
      range,
    });

    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}
