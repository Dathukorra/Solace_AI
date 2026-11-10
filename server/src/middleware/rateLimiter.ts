import rateLimit from 'express-rate-limit';

/**
 * Applies to all auth endpoints: 10 requests per 15 minutes per IP.
 * Skips counting successful responses (2xx) so only failed attempts count.
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: 429,
    message: 'Too many auth attempts, please try again in 15 minutes.',
  },
});
