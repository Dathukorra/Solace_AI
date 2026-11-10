import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../middleware/auth.middleware';
import { validateRequest } from '../middleware/validateRequest';
import { listMemoriesHandler, deleteMemoryHandler } from '../controllers/memory.controller';

const router = Router();

const memoryParamSchema = z.object({
  id: z.string().uuid('Invalid memory ID'),
});

// All memory routes require authentication
router.use(authenticate);

/**
 * GET /memories
 * Returns all stored user memories, sorted newest first.
 */
router.get('/', listMemoriesHandler);

/**
 * DELETE /memories/:id
 * Deletes a stored memory row if owned by the authenticated user.
 */
router.delete('/:id', validateRequest({ params: memoryParamSchema }), deleteMemoryHandler);

export default router;
