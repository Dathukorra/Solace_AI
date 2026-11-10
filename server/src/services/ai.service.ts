import Anthropic from '@anthropic-ai/sdk';
import { env } from '../lib/env';
import { logger } from '../lib/logger';

export type AIProvider = 'anthropic' | 'groq' | 'huggingface' | 'pollinations' | 'none';

let anthropicClient: Anthropic | null = null;
let loggedProvider: AIProvider | null = null;

function getAnthropicClient(): Anthropic | null {
  if (!anthropicClient && env.ANTHROPIC_API_KEY) {
    anthropicClient = new Anthropic({
      apiKey: env.ANTHROPIC_API_KEY,
    });
  }
  return anthropicClient;
}

/**
 * Chooses the active AI provider.
 * Priority: Anthropic -> Groq (ultra-fast) -> Hugging Face -> Pollinations (keyless demo fallback).
 */
export function getAIProvider(): AIProvider {
  if (env.ANTHROPIC_API_KEY) return 'anthropic';
  if (env.GROQ_API_KEY) return 'groq';
  if (env.HF_TOKEN) return 'huggingface';
  if (env.POLLINATIONS_ENABLED) return 'pollinations';
  return 'none';
}

function logProvider(provider: AIProvider): void {
  if (loggedProvider !== provider) {
    loggedProvider = provider;
    logger.info(`AI provider selected: ${provider}`);
  }
}

export interface ChatMessageParam {
  role: 'user' | 'assistant';
  content: string;
}

export const FALLBACK_REPLY =
  "I'm feeling a little quiet right now and couldn't connect fully, but I heard what you shared. Would you like to pause for a moment and try again, or take a gentle breath together?";

async function streamFallbackReply(onToken: (token: string) => void): Promise<string> {
  const fallback = FALLBACK_REPLY;
  // Simulate streaming chunks so the client experience stays consistent.
  for (const word of fallback.split(' ')) {
    onToken(word + ' ');
    await new Promise((r) => setTimeout(r, 25));
  }
  return fallback;
}

function extractText(content: unknown): string {
  if (typeof content === 'string') return content;

  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === 'string') return part;
        if (
          part &&
          typeof part === 'object' &&
          'text' in part &&
          typeof (part as { text?: unknown }).text === 'string'
        ) {
          return (part as { text: string }).text;
        }
        return '';
      })
      .join('');
  }

  return '';
}

function getOpenAICompatibleConfig(provider: 'groq' | 'huggingface' | 'pollinations'): {
  baseUrl: string;
  apiKey: string;
  model: string;
} {
  if (provider === 'groq') {
    return {
      baseUrl: env.GROQ_BASE_URL,
      apiKey: env.GROQ_API_KEY,
      model: env.GROQ_MODEL,
    };
  }

  if (provider === 'huggingface') {
    return {
      baseUrl: env.HF_BASE_URL,
      apiKey: env.HF_TOKEN,
      model: env.HF_MODEL,
    };
  }

  return {
    baseUrl: env.POLLINATIONS_BASE_URL,
    apiKey: env.POLLINATIONS_TOKEN,
    model: env.POLLINATIONS_MODEL,
  };
}

/**
 * Streams a reply from any OpenAI-compatible chat-completions endpoint.
 * Used for Groq (ultra-fast LPU), Hugging Face, and Pollinations APIs.
 */
async function streamOpenAICompatibleReply({
  provider,
  systemPrompt,
  messages,
  onToken,
}: {
  provider: 'groq' | 'huggingface' | 'pollinations';
  systemPrompt: string;
  messages: ChatMessageParam[];
  onToken: (token: string) => void;
}): Promise<string> {
  const { baseUrl, apiKey, model } = getOpenAICompatibleConfig(provider);
  const url = `${baseUrl.replace(/\/+$/, '')}/chat/completions`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'text/event-stream',
      ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
    },
    body: JSON.stringify({
      model,
      stream: true,
      max_tokens: 400,
      temperature: 0.7,
      // GPT-OSS spends most of its latency on hidden reasoning. Low effort keeps
      // chat responsive; this option is Pollinations-specific.
      ...(provider === 'pollinations' ? { reasoning_effort: 'low' } : {}),
      messages: [{ role: 'system', content: systemPrompt }, ...messages],
    }),
    signal: AbortSignal.timeout(60_000),
  });

  if (!response.ok) {
    const details = await response.text().catch(() => '');
    throw new Error(
      `${provider} API error ${response.status}${details ? `: ${details.slice(0, 300)}` : ''}`
    );
  }

  const contentType = response.headers.get('content-type') ?? '';

  // Some providers ignore `stream: true` and return a normal JSON response.
  if (!contentType.includes('text/event-stream')) {
    const payload = (await response.json()) as {
      choices?: Array<{ message?: { content?: unknown } }>;
    };
    const text = extractText(payload.choices?.[0]?.message?.content);
    if (text) onToken(text);
    return text;
  }

  if (!response.body) {
    throw new Error(`${provider} returned an empty response body`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let fullText = '';

  const handleLine = (line: string) => {
    const trimmed = line.trim();
    if (!trimmed.startsWith('data:')) return;

    const data = trimmed.slice(5).trim();
    if (!data || data === '[DONE]') return;

    try {
      const payload = JSON.parse(data) as {
        choices?: Array<{
          delta?: { content?: unknown };
          message?: { content?: unknown };
        }>;
      };
      const choice = payload.choices?.[0];
      // Only forward `content`; never expose internal `reasoning` deltas.
      const text = extractText(choice?.delta?.content ?? choice?.message?.content);
      if (text) {
        fullText += text;
        onToken(text);
      }
    } catch {
      // Ignore malformed SSE frames and keep the stream alive.
    }
  };

  let streamDone = false;
  while (!streamDone) {
    const { done, value } = await reader.read();
    if (done) {
      streamDone = true;
      break;
    }

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split(/\r?\n/);
    buffer = lines.pop() ?? '';
    for (const line of lines) handleLine(line);
  }

  buffer += decoder.decode();
  if (buffer.trim()) handleLine(buffer);

  return fullText;
}

/**
 * Streams an AI completion to a callback handler.
 *
 * Provider priority:
 * 1. Anthropic (when ANTHROPIC_API_KEY is set)
 * 2. Hugging Face Inference Providers (when HF_TOKEN is set)
 * 3. Pollinations keyless API (when POLLINATIONS_ENABLED is true)
 * 4. Friendly static fallback
 */
export async function streamClaudeReply({
  systemPrompt,
  messages,
  onToken,
}: {
  systemPrompt: string;
  messages: ChatMessageParam[];
  onToken: (token: string) => void;
}): Promise<string> {
  const provider = getAIProvider();
  logProvider(provider);

  if (provider === 'none') {
    logger.warn('No AI provider configured. Emitting friendly fallback.');
    return streamFallbackReply(onToken);
  }

  if (provider === 'groq' || provider === 'huggingface' || provider === 'pollinations') {
    let partialText = '';
    const emit = (token: string) => {
      partialText += token;
      onToken(token);
    };

    try {
      const text = await streamOpenAICompatibleReply({
        provider,
        systemPrompt,
        messages,
        onToken: emit,
      });

      if (text.trim()) return text;
      logger.warn(`${provider} returned an empty response. Emitting friendly fallback.`);
    } catch (error) {
      logger.error(`Error during ${provider} streaming call`, { error });
      if (partialText.trim()) return partialText;
    }

    return streamFallbackReply(onToken);
  }

  const client = getAnthropicClient();

  if (!client) {
    logger.warn('Anthropic API key is not configured. Emitting friendly fallback.');
    return streamFallbackReply(onToken);
  }

  let fullText = '';

  try {
    const stream = await client.messages.stream({
      model: env.ANTHROPIC_MODEL,
      max_tokens: 1024,
      system: systemPrompt,
      messages: messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
    });

    for await (const event of stream) {
      if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
        const text = event.delta.text;
        fullText += text;
        onToken(text);
      }
    }

    return fullText;
  } catch (error) {
    logger.error('Error during Anthropic streaming call', { error });
    // If nothing has streamed yet, emit the fallback reply
    if (!fullText.trim()) {
      onToken(FALLBACK_REPLY);
      return FALLBACK_REPLY;
    }
    return fullText;
  }
}

/**
 * Generates a concise 3 to 5 word title for a conversation exchange
 */
export async function generateConversationTitle({
  userMessage,
  assistantMessage,
}: {
  userMessage: string;
  assistantMessage: string;
}): Promise<string> {
  const client = getAnthropicClient();
  if (!client) {
    // Generate simple title from first few words of user message
    const words = userMessage.trim().split(/\s+/).slice(0, 4).join(' ');
    return words ? words.charAt(0).toUpperCase() + words.slice(1) : 'Mindful Check-in';
  }

  try {
    const response = await client.messages.create({
      model: env.ANTHROPIC_CHEAP_MODEL,
      max_tokens: 25,
      messages: [
        {
          role: 'user',
          content: `Summarize this initial wellness check-in into a 3 to 5 word title. Return ONLY the title text with no quotation marks, no punctuation at the end, and no extra explanation.\nUser: ${userMessage}\nAssistant: ${assistantMessage}`,
        },
      ],
    });

    const block = response.content[0];
    if (block && block.type === 'text') {
      const cleanTitle = block.text
        .trim()
        .replace(/^["']|["']$/g, '')
        .slice(0, 60);
      return cleanTitle || 'Mindful Check-in';
    }
    return 'Mindful Check-in';
  } catch (error) {
    logger.warn('Failed to generate conversation title with model, using fallback', { error });
    return 'Mindful Check-in';
  }
}

/**
 * Regenerates a 1 to 2 sentence summary of the conversation so far
 */
export async function generateConversationSummary(
  messages: Array<{ role: 'USER' | 'ASSISTANT'; content: string }>
): Promise<string | null> {
  const client = getAnthropicClient();
  if (!client) {
    return null;
  }

  try {
    const transcript = messages
      .slice(-10)
      .map((m) => `${m.role === 'USER' ? 'User' : 'Sola'}: ${m.content}`)
      .join('\n');

    const response = await client.messages.create({
      model: env.ANTHROPIC_CHEAP_MODEL,
      max_tokens: 100,
      messages: [
        {
          role: 'user',
          content: `In 1 or 2 concise sentences, summarize the core themes, feelings, or topics explored in this wellness conversation so far for Sola's memory context. Keep it compassionate and factual:\n${transcript}`,
        },
      ],
    });

    const block = response.content[0];
    if (block && block.type === 'text') {
      return block.text.trim();
    }
    return null;
  } catch (error) {
    logger.warn('Failed to generate conversation summary', { error });
    return null;
  }
}
