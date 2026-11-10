import { Request, Response, NextFunction } from 'express';
import { AppError } from '../lib/errors';
import * as HomeService from '../services/home.service';

function getUserId(req: Request): string {
  if (!req.user?.id) {
    throw new AppError('Authentication required', 401);
  }
  return req.user.id;
}

export async function getHomeHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = getUserId(req);
    const homeData = await HomeService.getHomeDashboard(userId);
    res.status(200).json(homeData);
  } catch (error) {
    next(error);
  }
}
