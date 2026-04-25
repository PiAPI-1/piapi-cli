import { readFile } from 'node:fs/promises';
import { basename } from 'node:path';
import { Endpoints } from '../client/endpoints';

export interface UploadResult {
  url: string;
  filename: string;
}

export async function uploadFile(apiKey: string, filePath: string): Promise<UploadResult> {
  const buf = await readFile(filePath);
  const b64 = buf.toString('base64');
  const filename = basename(filePath);

  const res = await fetch(`${Endpoints.UPLOAD_BASE}${Endpoints.FILE_UPLOAD}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
    },
    body: JSON.stringify({ file_name: filename, file_data: b64 }),
  });

  if (!res.ok) {
    const text = await res.text();
    let msg = text.slice(0, 300);
    try {
      const parsed = JSON.parse(text) as { message?: string; error?: string };
      msg = parsed.message || parsed.error || msg;
    } catch { /* keep raw */ }
    throw new Error(`Upload failed (${res.status} ${res.statusText}): ${msg || '(no body)'}`);
  }

  const data = await res.json() as { url: string };
  return { url: data.url, filename };
}
