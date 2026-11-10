import { useState, useEffect, useRef, useCallback } from 'react';
import { chatService } from './chatService';
import { Message, SuggestedActivity } from './types';

function mapMessage(m: {
  id: string;
  role: 'USER' | 'ASSISTANT' | 'SYSTEM';
  content: string;
  suggestedActivity?: SuggestedActivity | null;
  createdAt: string;
}): Message {
  return {
    id: m.id,
    sender: m.role === 'USER' ? 'user' : 'assistant',
    role: m.role,
    content: m.content,
    suggestedActivity: m.suggestedActivity,
    createdAt: m.createdAt,
    status: 'sent',
  };
}

export const useChat = (initialConversationId?: string, isNewChat = false, newChatKey?: string) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [isReplying, setIsReplying] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);

  const conversationIdRef = useRef<string | null>(null);
  const createConversationRef = useRef<Promise<string | null> | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const setActiveConversationId = useCallback((id: string | null) => {
    conversationIdRef.current = id;
    setConversationId(id);
  }, []);

  const startNewConversation = useCallback(async (): Promise<string | null> => {
    // Never let an old reply leak into a freshly created conversation.
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    setIsReplying(false);

    try {
      setIsLoadingHistory(true);
      const newConv = await chatService.createConversation('A Gentle Conversation');
      setActiveConversationId(newConv.id);
      setMessages([]);
      return newConv.id;
    } catch {
      setMessages([]);
      return null;
    } finally {
      setIsLoadingHistory(false);
    }
  }, [setActiveConversationId]);

  const loadConversation = useCallback(
    async (id: string) => {
      abortControllerRef.current?.abort();
      abortControllerRef.current = null;
      setIsReplying(false);

      const fullConv = await chatService.getConversation(id);
      setActiveConversationId(fullConv.id);
      setMessages((fullConv.messages ?? []).map(mapMessage));
    },
    [setActiveConversationId]
  );

  const loadOrCreateConversation = useCallback(async () => {
    try {
      setIsLoadingHistory(true);

      if (initialConversationId) {
        await loadConversation(initialConversationId);
        return;
      }

      const { conversations } = await chatService.getConversations(1);

      if (conversations.length > 0) {
        await loadConversation(conversations[0].id);
      } else {
        await startNewConversation();
      }
    } catch {
      // Keep the chat usable even if history cannot be fetched.
      setMessages([]);
    } finally {
      setIsLoadingHistory(false);
    }
  }, [initialConversationId, loadConversation, startNewConversation]);

  useEffect(() => {
    if (isNewChat) {
      void startNewConversation();
    } else {
      void loadOrCreateConversation();
    }
  }, [isNewChat, newChatKey, startNewConversation, loadOrCreateConversation]);

  // Cancel an in-flight stream when the screen unmounts.
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  /**
   * Returns the active conversation, creating one only when necessary.
   * Reuses an in-flight creation so a quick first message cannot create duplicates.
   */
  const ensureConversation = useCallback(async (): Promise<string | null> => {
    if (conversationIdRef.current) {
      return conversationIdRef.current;
    }

    if (!createConversationRef.current) {
      createConversationRef.current = chatService
        .createConversation('A Gentle Conversation')
        .then((conversation) => {
          setActiveConversationId(conversation.id);
          return conversation.id;
        })
        .catch(() => null)
        .finally(() => {
          createConversationRef.current = null;
        });
    }

    return createConversationRef.current;
  }, [setActiveConversationId]);

  // Send message and stream reply over SSE
  const sendMessage = useCallback(
    async (content: string, retryId?: string) => {
      const trimmed = content.trim();
      if (!trimmed) return;

      const userMsgId = retryId || `user-${Date.now()}`;
      const assistantMsgId = `assistant-${Date.now()}`;

      // 1. Optimistically add the user message
      setMessages((prev) => {
        const filtered = retryId ? prev.filter((m) => m.id !== retryId) : prev;
        return [
          ...filtered,
          {
            id: userMsgId,
            sender: 'user',
            role: 'USER',
            content: trimmed,
            createdAt: new Date().toISOString(),
            status: 'sent',
          },
        ];
      });

      setIsReplying(true);

      // 2. Make sure we have a conversation (created on demand)
      const targetConvId = await ensureConversation();

      if (!targetConvId) {
        setIsReplying(false);
        setMessages((prev) =>
          prev.map((m) => (m.id === userMsgId ? { ...m, status: 'error' } : m))
        );
        return;
      }

      // 3. Stream Sola's reply
      abortControllerRef.current?.abort();
      const controller = new AbortController();
      abortControllerRef.current = controller;

      let streamedText = '';

      await chatService.streamMessage({
        conversationId: targetConvId,
        content: trimmed,
        signal: controller.signal,
        onToken: (token: string) => {
          streamedText += token;

          setMessages((prev) => {
            const exists = prev.some((m) => m.id === assistantMsgId);
            if (!exists) {
              return [
                ...prev,
                {
                  id: assistantMsgId,
                  sender: 'assistant',
                  role: 'ASSISTANT',
                  content: streamedText,
                  createdAt: new Date().toISOString(),
                  status: 'streaming',
                },
              ];
            }
            return prev.map((m) =>
              m.id === assistantMsgId ? { ...m, content: streamedText, status: 'streaming' } : m
            );
          });
        },
        onDone: (data) => {
          if (abortControllerRef.current === controller) {
            abortControllerRef.current = null;
          }
          setIsReplying(false);

          const finalId = data.messageId || assistantMsgId;
          const finalActivity = data.suggestedActivity;
          const finalContent = data.fullText || streamedText;

          setMessages((prev) => {
            const exists = prev.some((m) => m.id === assistantMsgId);

            if (!exists) {
              if (!finalContent) return prev;
              return [
                ...prev,
                {
                  id: finalId,
                  sender: 'assistant',
                  role: 'ASSISTANT',
                  content: finalContent,
                  suggestedActivity: finalActivity,
                  createdAt: new Date().toISOString(),
                  status: 'sent',
                },
              ];
            }

            return prev.map((m) =>
              m.id === assistantMsgId
                ? {
                    ...m,
                    id: finalId,
                    content: finalContent,
                    suggestedActivity: finalActivity,
                    status: 'sent',
                  }
                : m
            );
          });
        },
        onError: () => {
          if (abortControllerRef.current === controller) {
            abortControllerRef.current = null;
          }
          setIsReplying(false);
          setMessages((prev) => {
            const withoutEmptyBubble = prev.filter(
              (m) => !(m.id === assistantMsgId && !m.content.trim())
            );
            return withoutEmptyBubble.map((m) =>
              m.id === userMsgId ? { ...m, status: 'error' } : m
            );
          });
        },
      });
    },
    [ensureConversation]
  );

  const addAssistantFollowup = useCallback((content: string) => {
    const followupId = `followup-${Date.now()}`;
    setMessages((prev) => [
      ...prev,
      {
        id: followupId,
        sender: 'assistant',
        role: 'ASSISTANT',
        content,
        createdAt: new Date().toISOString(),
        status: 'sent',
      },
    ]);
  }, []);

  return {
    messages,
    conversationId,
    isTyping,
    isReplying,
    isLoadingHistory,
    setIsTyping,
    sendMessage,
    addAssistantFollowup,
    startNewConversation,
    reload: loadOrCreateConversation,
  };
};
