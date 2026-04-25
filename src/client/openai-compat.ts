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
  const res = await fetch(`${client.baseUrl}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${client.apiKey}`,
    },
    body: JSON.stringify(body),
  });

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
