import { Router } from 'express';
import healthRoutes from './health.routes';
import authRoutes from './auth.routes';
import meRoutes from './me.routes';
import moodRoutes from './mood.routes';
import moodsRoutes from './moods.routes';
import progressRoutes from './progress.routes';
import homeRoutes from './home.routes';
import conversationRoutes from './conversation.routes';
import memoryRoutes from './memory.routes';
import activityRoutes from './activity.routes';
import reminderRoutes from './reminder.routes';
import pushTokenRoutes from './pushToken.routes';

const router = Router();

router.use('/health', healthRoutes);
router.use('/auth', authRoutes);
router.use('/me', meRoutes);
router.use('/mood', moodRoutes);
router.use('/moods', moodsRoutes);
router.use('/progress', progressRoutes);
router.use('/home', homeRoutes);
router.use('/conversations', conversationRoutes);
router.use('/memories', memoryRoutes);
router.use('/activities', activityRoutes);
router.use('/reminders', reminderRoutes);
router.use('/push-tokens', pushTokenRoutes);

export default router;
