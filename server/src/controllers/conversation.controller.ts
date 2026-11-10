import { Request, Response, NextFunction } from 'express';
import { AppError } from '../lib/errors';
import * as ConversationService from '../services/conversation.service';

function getUserId(req: Request): string {
  if (!req.user?.id) {
    throw new AppError('Authentication required', 401);
  }
  return req.user.id;
}

function getConversationId(req: Request): string {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  if (!id) {
    throw new AppError('Conversation ID is required', 400);
  }
  return id;
}

export async function listConversationsHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = getUserId(req);
    const cursor = typeof req.query.cursor === 'string' ? req.query.cursor : undefined;
    // validateRequest already coerces `limit` to a number; accept both forms.
    const rawLimit = req.query.limit as unknown;
    const limit =
      typeof rawLimit === 'number'
        ? rawLimit
        : typeof rawLimit === 'string'
          ? parseInt(rawLimit, 10)
          : undefined;

    const result = await ConversationService.listConversations({
      userId,
      cursor,
      limit,
    });

    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

export async function createConversationHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = getUserId(req);
    const { title, firstMessage } = req.body;

    const conversation = await ConversationService.createConversation({
      userId,
      title,
      firstMessage,
    });

    res.status(201).json({ conversation });
  } catch (error) {
    next(error);
  }
}

export async function getConversationHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = getUserId(req);
    const conversationId = getConversationId(req);

    const conversation = await ConversationService.getConversationById({
      conversationId,
      userId,
    });

    res.status(200).json({ conversation });
  } catch (error) {
    next(error);
  }
}

export async function renameConversationHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = getUserId(req);
    const conversationId = getConversationId(req);
    const { title } = req.body;

    const conversation = await ConversationService.renameConversation({
      conversationId,
      userId,
      title,
    });

    res.status(200).json({ conversation });
  } catch (error) {
    next(error);
  }
}

export async function deleteConversationHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = getUserId(req);
    const conversationId = getConversationId(req);

    const result = await ConversationService.deleteConversation({
      conversationId,
      userId,
    });

    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

export async function postMessageHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = getUserId(req);
    const conversationId = getConversationId(req);
    const { content } = req.body;

    await ConversationService.postMessageAndStream({
      conversationId,
      userId,
      content,
      res,
    });
  } catch (error) {
    next(error);
  }
}
