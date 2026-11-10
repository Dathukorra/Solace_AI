import { Request, Response, NextFunction } from 'express';
import { AppError } from '../lib/errors';
import * as PushTokenService from '../services/pushToken.service';

function getUserId(req: Request): string {
  if (!req.user?.id) {
    throw new AppError('Authentication required', 401);
  }
  return req.user.id;
}

export async function postPushTokenHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = getUserId(req);
    const { token, platform } = req.body;

    const pushToken = await PushTokenService.registerDevicePushToken({
      userId,
      token,
      platform,
    });

    res.status(200).json({
      success: true,
      data: pushToken,
    });
  } catch (error) {
    next(error);
  }
}
