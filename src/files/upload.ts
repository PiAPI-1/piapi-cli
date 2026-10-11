import { readFile } from 'node:fs/promises';
import { basename } from 'node:path';
import { Endpoints } from '../client/endpoints';
import { DEFAULT_TRANSFER_TIMEOUT_MS, resolveTimeout, timeoutSignal } from '../client/timeout';

export interface UploadResult {
  url: string;
  filename: string;
}

export async function uploadFile(apiKey: string, filePath: string): Promise<UploadResult> {
  const buf = await readFile(filePath);
  const b64 = buf.toString('base64');
  const filename = basename(filePath);

  let res: Response;
  try {
    res = await fetch(`${Endpoints.UPLOAD_BASE}${Endpoints.FILE_UPLOAD}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': apiKey,
      },
      body: JSON.stringify({ file_name: filename, file_data: b64 }),
      signal: timeoutSignal(DEFAULT_TRANSFER_TIMEOUT_MS),
    });
  } catch (e) {
    if (e instanceof Error && e.name === 'TimeoutError') {
      throw new Error(`Upload timed out after ${resolveTimeout(DEFAULT_TRANSFER_TIMEOUT_MS)}ms: ${filename} (set PIAPI_TIMEOUT_MS to override)`);
    }
    throw e;
  }

  if (!res.ok) {
    const text = await res.text();
    let msg = text.slice(0, 300);
    try {
      const parsed = JSON.parse(text) as { message?: string; error?: string };
      msg = parsed.message || parsed.error || msg;
    } catch { /* keep raw */ }
    throw new Error(`Upload failed (${res.status} ${res.statusText}): ${msg || '(no body)'}`);
  }

  const body: unknown = await res.json();
  return { url: extractUploadUrl(body, filename), filename };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function extractUploadUrl(body: unknown, filename: string): string {
  if (!isRecord(body)) {
    throw new Error(`Upload response for ${filename} is not a JSON object`);
  }

  // Error envelopes can arrive with HTTP 200 (e.g. {code:403,message:"Insufficient plan level"}).
  if (typeof body.code === 'number' && body.code !== 200) {
    const message = typeof body.message === 'string' && body.message ? body.message : `code ${body.code}`;
    throw new Error(`Upload failed for ${filename}: ${message}`);
  }

  const data = isRecord(body.data) ? body.data : undefined;
  const url = data?.url ?? body.url;
  if (typeof url !== 'string' || url === '') {
    throw new Error(`Upload response for ${filename} is missing a valid url`);
  }
  return url;
}
