import { APIError } from '../errors/api';

export interface RequestOptions {
  method?: string;
  path: string;
  body?: unknown;
  headers?: Record<string, string>;
  apiKey: string;
  baseUrl: string;
}

export async function request<T = unknown>(opts: RequestOptions): Promise<T> {
  const { method = 'GET', path, body, headers = {}, apiKey, baseUrl } = opts;

  const res = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': apiKey,
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  // Some PiAPI error paths return plain text (e.g. "404 page not found"),
  // so parse defensively and fall back to raw text for the error message.
  const text = await res.text();
  let data: { code?: number; message?: string; data?: T } = {};
  try { data = text ? JSON.parse(text) as typeof data : {}; } catch { /* keep empty */ }

  // PiAPI envelope: { code: 200, message: "success", data: {...} }
  // code follows HTTP convention (200 = success, >= 400 = error)
  const apiCode = typeof data.code === 'number' ? data.code : undefined;
  if (!res.ok || (apiCode !== undefined && apiCode >= 400)) {
    throw new APIError(
      data.message || text.slice(0, 200) || `HTTP ${res.status}`,
      res.status,
      apiCode !== undefined ? String(apiCode) : String(res.status),
    );
  }

  return (data.data ?? data) as T;
}
