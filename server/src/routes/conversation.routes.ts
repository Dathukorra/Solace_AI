import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../middleware/auth.middleware';
import { validateRequest } from '../middleware/validateRequest';
import {
  listConversationsHandler,
  createConversationHandler,
  getConversationHandler,
  renameConversationHandler,
  deleteConversationHandler,
  postMessageHandler,
} from '../controllers/conversation.controller';

const router = Router();

// ─── Schemas ──────────────────────────────────────────────────────────────────

const conversationParamSchema = z.object({
  id: z.string().uuid('Invalid conversation ID'),
});

const listQuerySchema = z.object({
  cursor: z.string().uuid().optional(),
  limit: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : undefined))
    .refine((val) => val === undefined || (val > 0 && val <= 50), {
      message: 'Limit must be between 1 and 50',
    }),
});

const createConversationSchema = z.object({
  title: z.string().max(100).optional(),
  firstMessage: z.string().min(1).optional(),
});

const renameConversationSchema = z.object({
  title: z.string().min(1, 'Title cannot be empty').max(100, 'Title is too long'),
});

const messageBodySchema = z.object({
  content: z.string().min(1, 'Message content cannot be empty'),
});

// All conversation routes require authentication
router.use(authenticate);

// ─── Conversation Collection ──────────────────────────────────────────────────

/**
 * GET /conversations
 * Returns conversations sorted newest first with cursor pagination and last message preview.
 */
router.get('/', validateRequest({ query: listQuerySchema }), listConversationsHandler);

/**
 * POST /conversations
 * Creates a new conversation with an optional initial user message.
 */
router.post('/', validateRequest({ body: createConversationSchema }), createConversationHandler);

// ─── Single Conversation Operations ───────────────────────────────────────────

/**
 * GET /conversations/:id
 * Retrieves conversation details and all associated messages in chronological order.
 */
router.get('/:id', validateRequest({ params: conversationParamSchema }), getConversationHandler);

/**
 * PATCH /conversations/:id
 * Renames a conversation title.
 */
router.patch(
  '/:id',
  validateRequest({
    params: conversationParamSchema,
    body: renameConversationSchema,
  }),
  renameConversationHandler
);

/**
 * DELETE /conversations/:id
 * Deletes a conversation, its messages, and any derived memories/summaries.
 */
router.delete(
  '/:id',
  validateRequest({ params: conversationParamSchema }),
  deleteConversationHandler
);

/**
 * POST /conversations/:id/messages
 * Sends a user message and streams Sola's response via Server-Sent Events (SSE).
 */
router.post(
  '/:id/messages',
  validateRequest({
    params: conversationParamSchema,
    body: messageBodySchema,
  }),
  postMessageHandler
);

export default router;
