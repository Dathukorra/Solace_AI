import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { getProgressHandler } from '../controllers/progress.controller';

const router = Router();

router.use(authenticate);

/**
 * GET /progress
 * Returns streaks, weekly mood averages, activity counts by type, and badges earned.
 */
router.get('/', getProgressHandler);

export default router;
