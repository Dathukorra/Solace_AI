import { Response } from 'express';
import { prisma } from '../lib/prisma';
import { AppError } from '../lib/errors';
import { logger } from '../lib/logger';
import { buildSolaSystemPrompt, parseSolaResponse, SolaPromptContext } from '../lib/solaPrompt';
import { createMarkerStreamFilter } from '../lib/markerStreamFilter';
import { detectCrisis, CRISIS_RESPONSE_TEXT } from './crisis.service';
import {
  streamClaudeReply,
  generateConversationTitle,
  generateConversationSummary,
  ChatMessageParam,
} from './ai.service';

export interface SendMessageOptions {
  conversationId: string;
  userId: string;
  content: string;
  res: Response;
}

/**
 * Handles sending a message in a conversation and streaming the response via SSE
 */
export async function postMessageAndStream({
  conversationId,
  userId,
  content,
  res,
}: SendMessageOptions): Promise<void> {
  // 1. Verify the conversation exists and belongs to the authenticated user
  const conversation = await prisma.conversation.findFirst({
    where: { id: conversationId, userId },
  });

  if (!conversation) {
    throw new AppError('Conversation not found', 404);
  }

  // 2. Load user profile for context and memory permissions
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new AppError('User not found', 404);
  }

  // 3. Save the user message in the database (never lost)
  await prisma.message.create({
    data: {
      conversationId,
      role: 'USER',
      content: content.trim(),
    },
  });

  // Set SSE response headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  // Prevent reverse proxies (ngrok, nginx, etc.) from buffering the stream.
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders?.();

  const sendEvent = (event: string, data: object | string) => {
    if (res.writableEnded) return;
    try {
      res.write(
        `event: ${event}\ndata: ${typeof data === 'string' ? data : JSON.stringify(data)}\n\n`
      );
    } catch (error) {
      logger.warn('Failed to write SSE event', { error });
    }
  };

  // Keep mobile networks and proxies from closing an idle stream.
  const heartbeat = setInterval(() => {
    if (res.writableEnded) return;
    try {
      res.write(': heartbeat\n\n');
    } catch {
      // Client already disconnected.
    }
  }, 15000);

  res.on('error', (error) => {
    logger.warn('SSE response error', { error });
  });

  const handleStream = async (): Promise<void> => {
    // 4. Crisis Check
    const isCrisis = detectCrisis(content);
    if (isCrisis) {
      logger.warn('Crisis keywords detected in user message. Triggering safety response.', {
        userId,
        conversationId,
      });

      // Stream safety response gently
      const words = CRISIS_RESPONSE_TEXT.split(' ');
      for (const word of words) {
        sendEvent('token', { token: word + ' ' });
        await new Promise((r) => setTimeout(r, 20));
      }

      const assistantMessage = await prisma.message.create({
        data: {
          conversationId,
          role: 'ASSISTANT',
          content: CRISIS_RESPONSE_TEXT,
          suggestedActivity: undefined,
        },
      });

      await prisma.conversation.update({
        where: { id: conversationId },
        data: { updatedAt: new Date() },
      });

      sendEvent('done', {
        messageId: assistantMessage.id,
        content: CRISIS_RESPONSE_TEXT,
        fullText: CRISIS_RESPONSE_TEXT,
        suggestedActivity: null,
        newMemories: [],
      });
      res.end();
      return;
    }

    // 5. Gather Context for Sola System Prompt
    const [recentMoods, rawMemories, otherConversations, messageHistory] = await Promise.all([
      prisma.moodCheckin.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 7,
      }),
      user.aiMemoryEnabled
        ? prisma.userMemory.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            take: 15,
          })
        : Promise.resolve([]),
      prisma.conversation.findMany({
        where: {
          userId,
          id: { not: conversationId },
          summary: { not: null },
        },
        orderBy: { updatedAt: 'desc' },
        take: 3,
      }),
      prisma.message.findMany({
        where: { conversationId },
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),
    ]);

    // Messages in chronological order
    const chronologicalMessages = messageHistory.reverse();

    // Determine today's check-in
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const todayCheckin = recentMoods.find((m) => new Date(m.createdAt) >= startOfToday);

    const promptContext: SolaPromptContext = {
      name: user.name,
      goals: user.goals,
      recentMoods: recentMoods.map((m) => ({
        score: m.mood,
        emotions: m.emotions,
        date: m.createdAt.toISOString().split('T')[0],
      })),
      todayMood: todayCheckin
        ? {
            score: todayCheckin.mood,
            emotions: todayCheckin.emotions,
            note: todayCheckin.note,
          }
        : undefined,
      memories: rawMemories.map((m) => m.fact),
      conversationSummaries: otherConversations
        .map((c) => c.summary)
        .filter((s): s is string => Boolean(s)),
    };

    const systemPrompt = buildSolaSystemPrompt(promptContext);

    // Format messages for Claude
    const claudeMessages: ChatMessageParam[] = chronologicalMessages.map((m) => ({
      role: m.role === 'USER' ? 'user' : 'assistant',
      content: m.content,
    }));

    // 6. Call Claude API with Streaming Enabled.
    // Marker blocks are stripped incrementally so they never flash in the UI.
    let rawResponse = '';
    const markerFilter = createMarkerStreamFilter((text) => {
      sendEvent('token', { token: text });
    });

    try {
      rawResponse = await streamClaudeReply({
        systemPrompt,
        messages: claudeMessages,
        onToken: markerFilter.push,
      });
    } catch (error) {
      logger.error('Failed to stream response from AI service', { error });
      // User message is already safely stored in DB
    } finally {
      markerFilter.flush();
    }

    // 7. Parse and strip [[ACTIVITY:...]] and [[MEMORY:...]] markers
    const { cleanContent, suggestedActivity, newMemories } = parseSolaResponse(rawResponse);

    // 8. Save Assistant Message in DB
    const assistantMessage = await prisma.message.create({
      data: {
        conversationId,
        role: 'ASSISTANT',
        content: cleanContent,
        suggestedActivity: suggestedActivity
          ? JSON.parse(JSON.stringify(suggestedActivity))
          : undefined,
      },
    });

    // 9. Save new memories (skip duplicates) if aiMemoryEnabled is true
    if (user.aiMemoryEnabled && newMemories.length > 0) {
      try {
        const existingMemories = await prisma.userMemory.findMany({
          where: { userId },
          select: { fact: true },
        });
        const existingSet = new Set(existingMemories.map((m) => m.fact.toLowerCase().trim()));

        for (const fact of newMemories) {
          const normalized = fact.toLowerCase().trim();
          if (!existingSet.has(normalized)) {
            await prisma.userMemory.create({
              data: {
                userId,
                fact,
                source: `conversation:${conversationId}`,
              },
            });
            existingSet.add(normalized);
          }
        }
      } catch (memError) {
        logger.warn('Error saving new memories', { memError });
      }
    }

    // 10. Update Conversation updatedAt
    await prisma.conversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    });

    // 11. Generate Title if this is the first exchange or conversation has default title
    const totalMessages = await prisma.message.count({ where: { conversationId } });
    const isDefaultTitle =
      !conversation.title ||
      conversation.title.trim() === '' ||
      conversation.title === 'New Conversation' ||
      conversation.title === 'Untitled';

    if (totalMessages <= 2 || isDefaultTitle) {
      generateConversationTitle({
        userMessage: content,
        assistantMessage: cleanContent,
      })
        .then(async (newTitle) => {
          if (newTitle) {
            await prisma.conversation.update({
              where: { id: conversationId },
              data: { title: newTitle },
            });
          }
        })
        .catch((err) => logger.warn('Background title generation failed', { err }));
    }

    // 12. Regenerate Conversation.summary every 10 messages
    if (totalMessages % 10 === 0) {
      const recentConvo = await prisma.message.findMany({
        where: { conversationId },
        orderBy: { createdAt: 'asc' },
        take: 20,
      });
      generateConversationSummary(recentConvo)
        .then(async (summary) => {
          if (summary) {
            await prisma.conversation.update({
              where: { id: conversationId },
              data: { summary },
            });
          }
        })
        .catch((err) => logger.warn('Background summary generation failed', { err }));
    }

    // 13. Send final 'done' SSE event with final message ID and structured payload
    sendEvent('done', {
      messageId: assistantMessage.id,
      content: cleanContent,
      fullText: cleanContent,
      suggestedActivity: suggestedActivity || null,
      newMemories,
    });

    res.end();
  };

  try {
    await handleStream();
  } catch (error) {
    logger.error('Failed to complete streamed message', { error });
    sendEvent('error', {
      message: 'Sola had trouble finishing that response. Please try again.',
    });
    if (!res.writableEnded) {
      res.end();
    }
  } finally {
    clearInterval(heartbeat);
  }
}

// ─── Conversation CRUD Operations ─────────────────────────────────────────────

export interface ListConversationsOptions {
  userId: string;
  cursor?: string;
  limit?: number;
}

export async function listConversations({ userId, cursor, limit = 20 }: ListConversationsOptions) {
  const safeLimit = Math.min(Math.max(limit, 1), 50);

  const items = await prisma.conversation.findMany({
    where: { userId },
    take: safeLimit + 1,
    ...(cursor && {
      skip: 1,
      cursor: { id: cursor },
    }),
    orderBy: { updatedAt: 'desc' },
    select: {
      id: true,
      title: true,
      updatedAt: true,
      createdAt: true,
      messages: {
        orderBy: { createdAt: 'desc' },
        take: 1,
        select: {
          id: true,
          content: true,
          role: true,
          createdAt: true,
        },
      },
    },
  });

  let nextCursor: string | null = null;
  let hasMore = false;

  if (items.length > safeLimit) {
    hasMore = true;
    items.pop(); // Remove extra item
    nextCursor = items[items.length - 1].id;
  }

  const conversations = items.map((c) => {
    const lastMsg = c.messages[0];
    return {
      id: c.id,
      title: c.title,
      lastMessage: lastMsg
        ? {
            id: lastMsg.id,
            content: lastMsg.content,
            preview:
              lastMsg.content.length > 120
                ? lastMsg.content.slice(0, 117) + '...'
                : lastMsg.content,
            role: lastMsg.role,
            createdAt: lastMsg.createdAt,
          }
        : null,
      updatedAt: c.updatedAt,
      createdAt: c.createdAt,
    };
  });

  return {
    items: conversations,
    nextCursor,
    hasMore,
  };
}

export interface CreateConversationOptions {
  userId: string;
  title?: string;
  firstMessage?: string;
}

export async function createConversation({
  userId,
  title,
  firstMessage,
}: CreateConversationOptions) {
  const conversation = await prisma.conversation.create({
    data: {
      userId,
      title: title?.trim() || 'New Conversation',
      ...(firstMessage?.trim() && {
        messages: {
          create: {
            role: 'USER',
            content: firstMessage.trim(),
          },
        },
      }),
    },
    include: {
      messages: {
        orderBy: { createdAt: 'asc' },
      },
    },
  });

  return conversation;
}

export async function getConversationById({
  conversationId,
  userId,
}: {
  conversationId: string;
  userId: string;
}) {
  const conversation = await prisma.conversation.findFirst({
    where: { id: conversationId, userId },
    include: {
      messages: {
        orderBy: { createdAt: 'asc' },
      },
    },
  });

  if (!conversation) {
    throw new AppError('Conversation not found', 404);
  }

  return conversation;
}

export async function renameConversation({
  conversationId,
  userId,
  title,
}: {
  conversationId: string;
  userId: string;
  title: string;
}) {
  const existing = await prisma.conversation.findFirst({
    where: { id: conversationId, userId },
  });

  if (!existing) {
    throw new AppError('Conversation not found', 404);
  }

  const updated = await prisma.conversation.update({
    where: { id: conversationId },
    data: {
      title: title.trim(),
      updatedAt: new Date(),
    },
  });

  return updated;
}

export async function deleteConversation({
  conversationId,
  userId,
}: {
  conversationId: string;
  userId: string;
}) {
  const existing = await prisma.conversation.findFirst({
    where: { id: conversationId, userId },
  });

  if (!existing) {
    throw new AppError('Conversation not found', 404);
  }

  // Remove memories and summaries derived from this conversation
  await prisma.userMemory.deleteMany({
    where: {
      userId,
      source: {
        in: [conversationId, `conversation:${conversationId}`],
      },
    },
  });

  // Cascade delete cleans up all messages
  await prisma.conversation.delete({
    where: { id: conversationId },
  });

  return { success: true, message: 'Conversation and derived summaries deleted' };
}
