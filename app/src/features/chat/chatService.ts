import { fetch as expoFetch } from 'expo/fetch';
import { apiClient, API_BASE_URL, getAuthToken, refreshAccessToken } from '../../api/client';
import { Conversation, ConversationWithMessages, SuggestedActivity } from './types';

interface RawLastMessage {
  id?: string;
  content?: string;
  preview?: string;
  role?: string;
  createdAt?: string;
}

interface RawConversation extends Omit<Conversation, 'lastMessage'> {
  lastMessage?: RawLastMessage | string | null;
}

interface ConversationsResponse {
  items?: RawConversation[];
  conversations?: RawConversation[];
  nextCursor?: string | null;
  hasMore?: boolean;
}

interface StreamDonePayload {
  messageId?: string;
  content?: string;
  fullText?: string;
  suggestedActivity?: SuggestedActivity | null;
  newMemories?: string[];
}

/** Normalizes the different conversation payload shapes into the app's model. */
function normalizeConversation(raw: RawConversation): Conversation {
  const lastMessage =
    typeof raw.lastMessage === 'string'
      ? raw.lastMessage
      : (raw.lastMessage?.preview ?? raw.lastMessage?.content ?? null);

  return { ...raw, lastMessage };
}

/**
 * Incremental Server-Sent Events parser.
 *
 * Keeps the parser state across network chunks so an `event:` line and its
 * matching `data:` line are not lost when the transport splits them.
 */
function createSseParser(onEvent: (eventName: string, data: string) => void) {
  let buffer = '';
  const boundary = /\r?\n\r?\n/;

  const dispatch = (frame: string) => {
    if (!frame.trim()) return;

    let eventName = 'message';
    const dataLines: string[] = [];

    for (const line of frame.split(/\r?\n/)) {
      if (!line || line.startsWith(':')) continue;

      const separator = line.indexOf(':');
      const field = separator === -1 ? line : line.slice(0, separator);
      let value = separator === -1 ? '' : line.slice(separator + 1);
      if (value.startsWith(' ')) value = value.slice(1);

      if (field === 'event') {
        eventName = value.trim();
      } else if (field === 'data') {
        dataLines.push(value);
      }
    }

    if (dataLines.length > 0) {
      onEvent(eventName, dataLines.join('\n'));
    }
  };

  return {
    push(chunk: string) {
      buffer += chunk;

      let match = boundary.exec(buffer);
      while (match) {
        dispatch(buffer.slice(0, match.index));
        buffer = buffer.slice(match.index + match[0].length);
        match = boundary.exec(buffer);
      }
    },
    flush() {
      if (buffer.trim()) dispatch(buffer);
      buffer = '';
    },
  };
}

function parseJson(raw: string): Record<string, any> | null {
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

export const chatService = {
  getConversations: async (limit = 20, cursor?: string) => {
    const url = `/conversations?limit=${limit}${cursor ? `&cursor=${cursor}` : ''}`;
    const response = await apiClient<ConversationsResponse>(url, { method: 'GET' });
    const items = response.conversations ?? response.items ?? [];

    return {
      conversations: items.map(normalizeConversation),
      nextCursor: response.nextCursor ?? null,
      hasMore: response.hasMore ?? false,
    };
  },

  createConversation: async (title?: string, firstMessage?: string): Promise<Conversation> => {
    const response = await apiClient<{ conversation?: RawConversation } & RawConversation>(
      '/conversations',
      {
        method: 'POST',
        body: JSON.stringify({ title, firstMessage }),
      }
    );

    return normalizeConversation(response.conversation ?? response);
  },

  getConversation: async (id: string): Promise<ConversationWithMessages> => {
    const response = await apiClient<
      { conversation?: ConversationWithMessages } & ConversationWithMessages
    >(`/conversations/${id}`, {
      method: 'GET',
    });

    return response.conversation ?? response;
  },

  renameConversation: async (id: string, title: string): Promise<Conversation> => {
    const response = await apiClient<{ conversation?: RawConversation } & RawConversation>(
      `/conversations/${id}`,
      {
        method: 'PATCH',
        body: JSON.stringify({ title }),
      }
    );

    return normalizeConversation(response.conversation ?? response);
  },

  deleteConversation: async (id: string) => {
    return apiClient<{ success: boolean; message: string }>(`/conversations/${id}`, {
      method: 'DELETE',
    });
  },

  /**
   * Streams a reply from POST /conversations/:id/messages using Server-Sent Events.
   *
   * Uses `expo/fetch` because React Native's global fetch buffers the whole
   * response instead of exposing a readable stream.
   */
  streamMessage: async ({
    conversationId,
    content,
    onToken,
    onDone,
    onError,
    signal,
  }: {
    conversationId: string;
    content: string;
    onToken: (token: string) => void;
    onDone: (data: StreamDonePayload) => void;
    onError: (err: Error) => void;
    signal?: AbortSignal;
  }) => {
    let finished = false;
    let accumulated = '';

    const finishWithError = (error: Error) => {
      if (finished) return;
      finished = true;
      if (!signal?.aborted) onError(error);
    };

    const handleEvent = (eventName: string, rawData: string) => {
      const payload = parseJson(rawData);
      if (!payload) return;

      if (eventName === 'token' || (eventName === 'message' && typeof payload.token === 'string')) {
        if (typeof payload.token === 'string') {
          accumulated += payload.token;
          onToken(payload.token);
        }
        return;
      }

      if (eventName === 'done') {
        if (finished) return;
        finished = true;
        onDone({
          messageId: payload.messageId,
          suggestedActivity: payload.suggestedActivity ?? undefined,
          newMemories: payload.newMemories,
          fullText: payload.fullText ?? payload.content ?? accumulated,
        });
        return;
      }

      if (eventName === 'error') {
        finishWithError(new Error(payload.message || 'The response stream failed.'));
      }
    };

    try {
      const token = await getAuthToken();
      const url = `${API_BASE_URL}/conversations/${conversationId}/messages`;

      const sendRequest = (accessToken: string | null) =>
        expoFetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'text/event-stream',
            ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
          },
          body: JSON.stringify({ content }),
          signal,
        });

      let response = await sendRequest(token);

      // Access tokens expire after 15 minutes. Refresh once and retry.
      if (response.status === 401) {
        const refreshedToken = await refreshAccessToken();
        if (refreshedToken) {
          response = await sendRequest(refreshedToken);
        }
      }

      if (!response.ok) {
        const errorJson = await response.json().catch(() => ({}));
        throw new Error(
          errorJson.message || errorJson.error || `Failed to send message: ${response.status}`
        );
      }

      const parser = createSseParser(handleEvent);

      if (response.body && typeof (response.body as any).getReader === 'function') {
        const reader = (response.body as any).getReader();
        const decoder = new TextDecoder('utf-8');

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          parser.push(decoder.decode(value, { stream: true }));
        }

        parser.push(decoder.decode());
        parser.flush();
      } else {
        // Fallback for platforms without a readable body.
        parser.push(await response.text());
        parser.flush();
      }

      if (!finished) {
        if (accumulated) {
          finished = true;
          onDone({ fullText: accumulated });
        } else {
          finishWithError(new Error('The response stream ended unexpectedly.'));
        }
      }
    } catch (error: any) {
      if (error?.name === 'AbortError') return;
      finishWithError(error instanceof Error ? error : new Error(String(error)));
    }
  },
};
