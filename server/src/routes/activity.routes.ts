import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../middleware/auth.middleware';
import { validateRequest } from '../middleware/validateRequest';
import { postActivityHandler } from '../controllers/activity.controller';

const router = Router();

const postActivitySchema = z.object({
  type: z.enum(['BREATHING', 'MEDITATION', 'JOURNALING', 'MOVEMENT', 'REFLECTION', 'BODY_SCAN']),
  durationSec: z.number().int().positive('Duration must be a positive integer in seconds'),
});

router.use(authenticate);

/**
 * POST /activities
 * Records a completed wellness exercise session.
 */
router.post('/', validateRequest({ body: postActivitySchema }), postActivityHandler);

export default router;
