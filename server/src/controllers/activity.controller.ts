import { Request, Response, NextFunction } from 'express';
import { AppError } from '../lib/errors';
import * as ActivityService from '../services/activity.service';

function getUserId(req: Request): string {
  if (!req.user?.id) {
    throw new AppError('Authentication required', 401);
  }
  return req.user.id;
}

export async function postActivityHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = getUserId(req);
    const { type, durationSec } = req.body;

    const activity = await ActivityService.recordCompletedActivity({
      userId,
      type,
      durationSec,
    });

    res.status(201).json({
      success: true,
      data: activity,
    });
  } catch (error) {
    next(error);
  }
}
