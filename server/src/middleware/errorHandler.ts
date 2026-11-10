import { Request, Response, NextFunction, ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../lib/errors';
import { logger } from '../lib/logger';
import { env } from '../lib/env';

export const errorHandler: ErrorRequestHandler = (
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  // Handle Zod Validation Errors
  if (err instanceof ZodError) {
    res.status(400).json({
      success: false,
      error: 'Validation Error',
      details: err.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
      })),
    });
    return;
  }

  // Handle Custom Application Errors
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      error: err.message,
      // Keep `message` for clients (and tests) that use the conventional field.
      message: err.message,
      details: err.details,
    });
    return;
  }

  // Handle Prisma Known Request Errors
  if ('code' in err && typeof err.code === 'string' && err.code.startsWith('P')) {
    logger.error('Prisma Error:', err);
    res.status(400).json({
      success: false,
      error: 'Database operation failed',
      code: err.code,
    });
    return;
  }

  // Handle Unexpected Internal Server Errors
  logger.error('Unhandled Server Error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal Server Error',
    ...(env.NODE_ENV === 'development' ? { message: err.message, stack: err.stack } : {}),
  });
};
