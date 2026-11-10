import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../middleware/auth.middleware';
import { validateRequest } from '../middleware/validateRequest';
import {
  listRemindersHandler,
  createReminderHandler,
  getReminderHandler,
  updateReminderHandler,
  deleteReminderHandler,
} from '../controllers/reminder.controller';

const router = Router();

const reminderTypeEnum = z.enum([
  'MOOD',
  'AFFIRMATION',
  'BREATHING',
  'SELFCARE',
  'CUSTOM',
  'MINDFULNESS',
  'HYDRATION',
  'GRATITUDE',
  'CHECK_IN',
  'WIND_DOWN',
  'BREATHWORK',
]);

const reminderParamSchema = z.object({
  id: z.string().uuid('Invalid reminder ID'),
});

const createReminderSchema = z.object({
  type: reminderTypeEnum,
  title: z.string().min(1, 'Title cannot be empty').max(100),
  time: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Time must be in HH:mm 24-hour format'),
  days: z
    .array(z.number().int().min(0, 'Days must be 0-6').max(6, 'Days must be 0-6'))
    .min(1, 'Select at least one day (0-6)'),
  enabled: z.boolean().optional(),
});

const updateReminderSchema = z.object({
  type: reminderTypeEnum.optional(),
  title: z.string().min(1).max(100).optional(),
  time: z
    .string()
    .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Time must be in HH:mm 24-hour format')
    .optional(),
  days: z.array(z.number().int().min(0).max(6)).min(1).optional(),
  enabled: z.boolean().optional(),
});

router.use(authenticate);

/**
 * GET /reminders
 * Lists all reminders for the authenticated user.
 */
router.get('/', listRemindersHandler);

/**
 * POST /reminders
 * Creates a new scheduled reminder.
 */
router.post('/', validateRequest({ body: createReminderSchema }), createReminderHandler);

/**
 * GET /reminders/:id
 * Retrieves a specific reminder by ID.
 */
router.get('/:id', validateRequest({ params: reminderParamSchema }), getReminderHandler);

/**
 * PATCH /reminders/:id
 * Updates scheduled reminder properties.
 */
router.patch(
  '/:id',
  validateRequest({
    params: reminderParamSchema,
    body: updateReminderSchema,
  }),
  updateReminderHandler
);

/**
 * DELETE /reminders/:id
 * Deletes a scheduled reminder.
 */
router.delete('/:id', validateRequest({ params: reminderParamSchema }), deleteReminderHandler);

export default router;
