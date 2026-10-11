// GPT-image endpoints not covered by openai-compat.ts:
//   - synchronous image edit: POST /v1/images/edits (multipart, Bearer, 120s)
//   - async submit: POST /api/v1/images/generations/async (JSON) and
//     /api/v1/images/edits/async (multipart), both X-API-Key, 30s
//
// The async API lives on the `/api/v1` prefix (sync is `/v1`) and answers
// either a raw task shell ({ task_id, status, ... }) or the standard
// { code, message, data } envelope — both are accepted. A failed submit is
// final; there are no retries here or server-side.
//
// Source: https://piapi.ai/docs/gpt-image/gpt-image-api.md (asynchronous API)

import { Endpoints } from './endpoints';
import { APIError } from '../errors/api';
import { buildImageEditForm } from '../files/image-parts';
import { TASK_STATUSES, type TaskData } from '../types/api';
import { DEFAULT_API_TIMEOUT_MS, DEFAULT_IMAGE_TIMEOUT_MS, resolveTimeout, timeoutSignal } from './timeout';
import type { ImageRequest, ImageResponse, OpenAIClient } from './openai-compat';

function timeoutError(defaultMs: number): APIError {
  return new APIError(
    `Request timed out after ${resolveTimeout(defaultMs)}ms (set PIAPI_TIMEOUT_MS to override)`,
    0,
    'TIMEOUT',
  );
}

// Keep the upstream wording wherever it exists — it is what the user needs to
// fix their request (bad model, rejected quality tier, content policy, ...).
async function upstreamErrorMessage(res: Response): Promise<string> {
  const text = await res.text();
  let msg = text.slice(0, 500);
  try {
    const parsed = JSON.parse(text) as { error?: { message?: string }; message?: string };
    msg = parsed.error?.message || parsed.message || msg;
  } catch { /* keep raw */ }
  return msg || `HTTP ${res.status}`;
}

export async function imageEdit(client: OpenAIClient, body: ImageRequest): Promise<ImageResponse> {
  // Validates the shape and stats/reads every reference first, so a missing
  // or invalid local file fails before the network request.
  const form = await buildImageEditForm(body);

  let res: Response;
  try {
    res = await fetch(`${client.baseUrl}${Endpoints.IMAGE_EDITS}`, {
      method: 'POST',
      // No Content-Type: fetch sets the multipart boundary itself.
      headers: { Authorization: `Bearer ${client.apiKey}` },
      body: form,
      signal: timeoutSignal(DEFAULT_IMAGE_TIMEOUT_MS),
    });
  } catch (e) {
    if (e instanceof Error && e.name === 'TimeoutError') throw timeoutError(DEFAULT_IMAGE_TIMEOUT_MS);
    throw e;
  }

  if (!res.ok) {
    throw new APIError(await upstreamErrorMessage(res), res.status, String(res.status));
  }
  return JSON.parse(await res.text()) as ImageResponse;
}

interface AsyncSubmitEnvelope {
  code?: number;
  message?: string;
  data?: unknown;
  [key: string]: unknown;
}

export async function submitImageTask(
  client: OpenAIClient,
  body: ImageRequest,
  edit: boolean,
): Promise<TaskData> {
  const init: RequestInit = { method: 'POST', signal: timeoutSignal(DEFAULT_API_TIMEOUT_MS) };
  const path = edit ? Endpoints.IMAGE_EDITS_ASYNC : Endpoints.IMAGE_GENERATIONS_ASYNC;
  if (edit) {
    init.headers = { 'X-API-Key': client.apiKey };
    // Built before fetch, so file problems never reach the network.
    init.body = await buildImageEditForm(body);
  } else {
    init.headers = { 'Content-Type': 'application/json', 'X-API-Key': client.apiKey };
    init.body = JSON.stringify(body);
  }

  let res: Response;
  try {
    res = await fetch(`${client.baseUrl}${path}`, init);
  } catch (e) {
    if (e instanceof Error && e.name === 'TimeoutError') throw timeoutError(DEFAULT_API_TIMEOUT_MS);
    throw e;
  }

  const text = await res.text();
  let parsed: AsyncSubmitEnvelope = {};
  try {
    const value: unknown = text ? JSON.parse(text) : undefined;
    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      parsed = value as AsyncSubmitEnvelope;
    }
  } catch { /* malformed bodies are rejected below */ }

  // Same convention as src/client/http.ts: envelope codes follow HTTP,
  // 200 = success, >= 400 = error. Raw shells have no `code` at all.
  const apiCode = typeof parsed.code === 'number' ? parsed.code : undefined;
  if (!res.ok || (apiCode !== undefined && apiCode >= 400)) {
    throw new APIError(
      parsed.message || text.slice(0, 500) || `HTTP ${res.status}`,
      res.status,
      apiCode !== undefined ? String(apiCode) : String(res.status),
    );
  }

  const task = (parsed.data ?? parsed) as Partial<TaskData> | null;
  if (
    !task || typeof task !== 'object'
    || typeof task.task_id !== 'string' || task.task_id === ''
    || typeof task.status !== 'string' || !TASK_STATUSES.includes(task.status)
  ) {
    throw new APIError(
      `Malformed async submit response: missing task_id/status`,
      res.status,
      String(res.status),
    );
  }
  return task as TaskData;
}
