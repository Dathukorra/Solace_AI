import { Router } from 'express';
import { z } from 'zod';
import { validateRequest } from '../middleware/validateRequest';
import { authenticate } from '../middleware/auth.middleware';
import { authLimiter } from '../middleware/rateLimiter';
import { GENDERS, isValidDateOnly, todayIsoDate } from '../lib/profile';
import {
  signupHandler,
  loginHandler,
  refreshHandler,
  forgotPasswordHandler,
  resetPasswordHandler,
  getMeHandler,
  updateMeHandler,
} from '../controllers/auth.controller';

const router = Router();

// ─── Schemas ──────────────────────────────────────────────────────────────────

const signupBodySchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(50, 'Name is too long'),
  email: z.string().email('Invalid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  goals: z.array(z.string()).default([]),
  timezone: z.string().optional(),
});

const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number');

const forgotPasswordBodySchema = z.object({
  email: z.string().trim().email('Invalid email address'),
});

const resetPasswordBodySchema = z.object({
  token: z.string().trim().min(16, 'Reset token is required').max(256, 'Invalid reset token'),
  password: passwordSchema,
});

const loginBodySchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

const refreshBodySchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

const updateMeBodySchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Name must be at least 2 characters')
    .max(50, 'Name is too long')
    .optional(),
  email: z.string().trim().email('Invalid email address').max(254).optional(),
  goals: z.array(z.string()).optional(),
  timezone: z.string().optional(),
  aiMemoryEnabled: z.boolean().optional(),
  hasSeenTour: z.boolean().optional(),
  age: z
    .number({ invalid_type_error: 'Age must be a number' })
    .int('Age must be a whole number')
    .min(1, 'Age must be a positive number')
    .max(120, 'Age must be 120 or younger')
    .nullable()
    .optional(),
  gender: z
    .enum(GENDERS, { errorMap: () => ({ message: 'Select a valid gender' }) })
    .nullable()
    .optional(),
  dateOfBirth: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date of birth must use YYYY-MM-DD')
    .refine(isValidDateOnly, 'Enter a valid calendar date')
    .refine((value) => value >= '1900-01-01', 'Date of birth is too far in the past')
    .refine((value) => value <= todayIsoDate(), 'Date of birth cannot be in the future')
    .nullable()
    .optional(),
  phoneNumber: z
    .string()
    .trim()
    .regex(/^\+?[0-9]{7,15}$/, 'Enter a valid phone number (7-15 digits)')
    .nullable()
    .optional(),
  location: z.string().trim().max(120, 'Location is too long').nullable().optional(),
  avatar: z
    .string()
    .max(3_000_000, 'Profile picture is too large (max 2 MB)')
    .nullable()
    .optional(),
});

// ─── Auth routes (rate-limited) ───────────────────────────────────────────────

router.post('/signup', authLimiter, validateRequest({ body: signupBodySchema }), signupHandler);
router.post('/login', authLimiter, validateRequest({ body: loginBodySchema }), loginHandler);
router.post('/refresh', authLimiter, validateRequest({ body: refreshBodySchema }), refreshHandler);
router.post(
  '/forgot-password',
  authLimiter,
  validateRequest({ body: forgotPasswordBodySchema }),
  forgotPasswordHandler
);
router.post(
  '/reset-password',
  authLimiter,
  validateRequest({ body: resetPasswordBodySchema }),
  resetPasswordHandler
);

// ─── Protected /me routes ─────────────────────────────────────────────────────

router.get('/me', authenticate, getMeHandler);
router.patch('/me', authenticate, validateRequest({ body: updateMeBodySchema }), updateMeHandler);

export default router;
