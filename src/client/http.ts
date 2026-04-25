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

  const data = await res.json() as { code: number; message: string; data?: T };

  if (!res.ok || data.code !== 0) {
    throw new APIError(
      data.message ?? `HTTP ${res.status}`,
      res.status,
      String(data.code),
    );
  }

  return data.data as T;
}
