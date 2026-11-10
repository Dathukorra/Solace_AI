import { Router } from 'express';
import { z } from 'zod';
import { MoodController } from '../controllers/mood.controller';
import { validateRequest } from '../middleware/validateRequest';

const router = Router();

const createMoodSchema = z.object({
  mood: z.union([
    z.number().int().min(1).max(5),
    z.enum(['rough', 'low', 'okay', 'good', 'great']).transform((val) => {
      switch (val) {
        case 'rough':
          return 1;
        case 'low':
          return 2;
        case 'okay':
          return 3;
        case 'good':
          return 4;
        case 'great':
          return 5;
      }
    }),
  ]),
  emotions: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(), // alias support
  note: z.string().max(500).optional(),
});

router.get('/', MoodController.list);
router.post('/', validateRequest({ body: createMoodSchema }), MoodController.create);

export default router;
