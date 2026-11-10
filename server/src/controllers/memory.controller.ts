import { Request, Response, NextFunction } from 'express';
import { AppError } from '../lib/errors';
import * as MemoryService from '../services/memory.service';

function getUserId(req: Request): string {
  if (!req.user?.id) {
    throw new AppError('Authentication required', 401);
  }
  return req.user.id;
}

export async function listMemoriesHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = getUserId(req);
    const memories = await MemoryService.getUserMemories(userId);
    res.status(200).json({ items: memories });
  } catch (error) {
    next(error);
  }
}

export async function deleteMemoryHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = getUserId(req);
    const memoryId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

    if (!memoryId) {
      throw new AppError('Memory ID is required', 400);
    }

    const result = await MemoryService.deleteUserMemory({
      memoryId,
      userId,
    });

    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}
