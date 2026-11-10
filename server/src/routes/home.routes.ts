import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { getHomeHandler } from '../controllers/home.controller';

const router = Router();

router.use(authenticate);

/**
 * GET /home
 * Returns personalized dashboard data: local greeting, check-in status,
 * deterministic daily affirmation with AI personalization, mood trend suggestion,
 * streak, and next reminder.
 */
router.get('/', getHomeHandler);

export default router;
