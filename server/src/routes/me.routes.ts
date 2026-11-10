import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../middleware/auth.middleware';
import { validateRequest } from '../middleware/validateRequest';
import { getMeHandler, updateMeHandler } from '../controllers/auth.controller';

const router = Router();

const updateMeSchema = z.object({
  name: z.string().min(2).max(50).optional(),
  goals: z.array(z.string()).optional(),
  timezone: z.string().optional(),
  aiMemoryEnabled: z.boolean().optional(),
  hasSeenTour: z.boolean().optional(),
});

router.use(authenticate);

router.get('/', getMeHandler);
router.patch('/', validateRequest({ body: updateMeSchema }), updateMeHandler);

export default router;
