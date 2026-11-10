import { Request, Response, NextFunction } from 'express';
import { AppError } from '../lib/errors';
import * as ProgressService from '../services/progress.service';

function getUserId(req: Request): string {
  if (!req.user?.id) {
    throw new AppError('Authentication required', 401);
  }
  return req.user.id;
}

export async function getProgressHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = getUserId(req);
    const progress = await ProgressService.getUserProgress(userId);
    res.status(200).json(progress);
  } catch (error) {
    next(error);
  }
}
