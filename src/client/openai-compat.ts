// PiAPI OpenAI-compatible endpoints (separate from the unified task API).
// Differences from src/client/http.ts:
//   - Auth: `Authorization: Bearer <key>` (not X-API-Key)
//   - Response: raw OpenAI-shaped JSON, no { code, message, data } envelope
//   - Sync: returns immediately, no task lifecycle / polling
//
// Sources:
//   https://piapi.ai/docs/llm-api/completions.md
//   https://piapi.ai/docs/gpt-image/gpt-image-api.md

import { APIError } from '../errors/api';
import { DEFAULT_API_TIMEOUT_MS, resolveTimeout, timeoutSignal } from './timeout';

export interface OpenAIClient {
  apiKey: string;
  baseUrl: string;
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatRequest {
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  top_p?: number;
  max_tokens?: number;
  stop?: string;
  [key: string]: unknown;
}

export interface ChatResponse {
  id?: string;
  model?: string;
  choices: { index: number; message: { role: string; content: string }; finish_reason?: string }[];
  usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
}

export interface ImageRequest {
  model: string;
  prompt: string;
  n?: number;
  size?: string;
  quality?: string;
  output_format?: string;
  [key: string]: unknown;
}

export interface ImageResponse {
  created?: number;
  data: { url?: string; b64_json?: string }[];
  usage?: { input_tokens?: number; output_tokens?: number; total_tokens?: number };
}

async function postBearer<T>(client: OpenAIClient, path: string, body: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${client.baseUrl}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${client.apiKey}`,
      },
      body: JSON.stringify(body),
      signal: timeoutSignal(DEFAULT_API_TIMEOUT_MS),
    });
  } catch (e) {
    if (e instanceof Error && e.name === 'TimeoutError') {
      throw new APIError(`Request timed out after ${resolveTimeout(DEFAULT_API_TIMEOUT_MS)}ms (set PIAPI_TIMEOUT_MS to override)`, 0, 'TIMEOUT');
    }
    throw e;
  }

  const text = await res.text();
  if (!res.ok) {
    let msg = text.slice(0, 500);
    try {
      const parsed = JSON.parse(text) as { error?: { message?: string }; message?: string };
      msg = parsed.error?.message || parsed.message || msg;
    } catch { /* keep raw */ }
    throw new APIError(msg || `HTTP ${res.status}`, res.status, String(res.status));
  }
  return JSON.parse(text) as T;
}

export function chatCompletion(client: OpenAIClient, body: ChatRequest): Promise<ChatResponse> {
  return postBearer<ChatResponse>(client, '/v1/chat/completions', body);
}

export function imageGeneration(client: OpenAIClient, body: ImageRequest): Promise<ImageResponse> {
  return postBearer<ImageResponse>(client, '/v1/images/generations', body);
}

export type ChatUsage = NonNullable<ChatResponse['usage']>;
export type ChatStreamEvent =
  | { type: 'delta'; content: string }
  | { type: 'usage'; usage: ChatUsage }
  | { type: 'done' };

interface ChatStreamChunk {
  choices?: { index: number; delta?: { content?: string }; finish_reason?: string | null }[];
  usage?: ChatUsage;
}

// SSE-streaming variant. PiAPI's sora2-preview / sora2-hd-preview force
// stream=true and emit chat.completion.chunk events whose `delta.content`
// concatenates to the assistant message; the final chunk carries `usage`.
// We swallow malformed/empty `data:` lines defensively because PiAPI also
// emits keep-alive blank lines and the trailing `data: [DONE]` sentinel.
export async function* chatCompletionStream(
  client: OpenAIClient,
  body: ChatRequest,
): AsyncGenerator<ChatStreamEvent, void, void> {
  // Timeout the initial handshake only; once `fetch` resolves the signal no
  // longer applies to the streaming body read, which is what we want — long
  // streaming responses should never trip the API timeout mid-flight.
  let res: Response;
  try {
    res = await fetch(`${client.baseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${client.apiKey}`,
        Accept: 'text/event-stream',
      },
      body: JSON.stringify({ ...body, stream: true }),
      signal: timeoutSignal(DEFAULT_API_TIMEOUT_MS),
    });
  } catch (e) {
    if (e instanceof Error && e.name === 'TimeoutError') {
      throw new APIError(`Request timed out after ${resolveTimeout(DEFAULT_API_TIMEOUT_MS)}ms (set PIAPI_TIMEOUT_MS to override)`, 0, 'TIMEOUT');
    }
    throw e;
  }

  if (!res.ok || !res.body) {
    const text = await res.text();
    let msg = text.slice(0, 500);
    try {
      const parsed = JSON.parse(text) as { error?: { message?: string }; message?: string };
      msg = parsed.error?.message || parsed.message || msg;
    } catch { /* keep raw */ }
    throw new APIError(msg || `HTTP ${res.status}`, res.status, String(res.status));
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      // SSE events are separated by blank lines (\n\n or \r\n\r\n).
      let sep: number;
      while ((sep = buffer.search(/\r?\n\r?\n/)) !== -1) {
        const eventBlock = buffer.slice(0, sep);
        buffer = buffer.slice(sep).replace(/^\r?\n\r?\n/, '');

        for (const rawLine of eventBlock.split(/\r?\n/)) {
          const line = rawLine.trimStart();
          if (!line.startsWith('data:')) continue;
          const payload = line.slice(5).trim();
          if (!payload) continue;
          if (payload === '[DONE]') { yield { type: 'done' }; return; }
          try {
            const chunk = JSON.parse(payload) as ChatStreamChunk;
            const delta = chunk.choices?.[0]?.delta?.content;
            if (typeof delta === 'string' && delta.length > 0) {
              yield { type: 'delta', content: delta };
            }
            if (chunk.usage) yield { type: 'usage', usage: chunk.usage };
          } catch { /* malformed chunk — skip */ }
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}
