import { APIError } from '../errors/api';
import { DEFAULT_API_TIMEOUT_MS, resolveTimeout, timeoutSignal } from './timeout';

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

  let res: Response;
  try {
    res = await fetch(`${baseUrl}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': apiKey,
        ...headers,
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: timeoutSignal(DEFAULT_API_TIMEOUT_MS),
    });
  } catch (e) {
    if (e instanceof Error && e.name === 'TimeoutError') {
      throw new APIError(`Request timed out after ${resolveTimeout(DEFAULT_API_TIMEOUT_MS)}ms (set PIAPI_TIMEOUT_MS to override)`, 0, 'TIMEOUT');
    }
    throw e;
  }

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
