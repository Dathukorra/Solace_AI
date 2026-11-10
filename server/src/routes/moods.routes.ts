import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../middleware/auth.middleware';
import { validateRequest } from '../middleware/validateRequest';
import { postMoodHandler, getMoodsHandler } from '../controllers/moods.controller';

const router = Router();

const postMoodSchema = z.object({
  mood: z
    .number()
    .int()
    .min(1, 'Mood score must be between 1 and 5')
    .max(5, 'Mood score must be between 1 and 5'),
  emotions: z.array(z.string()).default([]),
  note: z.string().max(500, 'Note is too long').optional().nullable(),
});

const getMoodsQuerySchema = z.object({
  range: z.enum(['7d', '30d']).optional(),
});

// All mood routes require authentication
router.use(authenticate);

/**
 * POST /moods
 * Records or updates the user's single check-in for their local calendar day.
 */
router.post('/', validateRequest({ body: postMoodSchema }), postMoodHandler);

/**
 * GET /moods?range=7d|30d
 * Retrieves mood history for the specified duration with average mood.
 */
router.get('/', validateRequest({ query: getMoodsQuerySchema }), getMoodsHandler);

export default router;
