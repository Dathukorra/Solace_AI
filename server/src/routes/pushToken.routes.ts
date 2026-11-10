import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../middleware/auth.middleware';
import { validateRequest } from '../middleware/validateRequest';
import { postPushTokenHandler } from '../controllers/pushToken.controller';

const router = Router();

const pushTokenSchema = z.object({
  token: z.string().min(1, 'Token cannot be empty'),
  platform: z.string().optional(),
});

router.use(authenticate);

/**
 * POST /push-tokens
 * Registers or updates an Expo device push token.
 */
router.post('/', validateRequest({ body: pushTokenSchema }), postPushTokenHandler);

export default router;
