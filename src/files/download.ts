import { mkdir, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { basename, extname, join } from 'node:path';
import { DEFAULT_TRANSFER_TIMEOUT_MS, resolveTimeout, timeoutSignal } from '../client/timeout';

export interface DownloadOptions {
  outDir?: string;
  quiet?: boolean;
}

// Never overwrite: batch results frequently share a basename (image.png from
// different URL paths), and clobbering a previous render loses paid output.
// On collision, append -1, -2, … before the extension.
function uniquePath(dir: string, name: string): string {
  let p = join(dir, name);
  if (!existsSync(p)) return p;
  const ext = extname(name);
  const stem = name.slice(0, name.length - ext.length);
  for (let i = 1; ; i++) {
    p = join(dir, `${stem}-${i}${ext}`);
    if (!existsSync(p)) return p;
  }
}

// Decode an OpenAI-style `b64_json` payload to disk under the same outDir
// rules as downloadUrl(). Filename is caller-supplied since base64 carries
// no path info; defaults to a timestamped .png.
export async function saveBase64(
  b64: string,
  filename: string | undefined,
  opts: DownloadOptions = {},
): Promise<string> {
  const dir = opts.outDir ?? process.cwd();
  await mkdir(dir, { recursive: true });
  const name = filename || `image-${Date.now()}.png`;
  const finalPath = uniquePath(dir, name);
  await writeFile(finalPath, Buffer.from(b64, 'base64'));
  if (!opts.quiet) process.stderr.write(`Saved → ${finalPath}\n`);
  return finalPath;
}

// Derive a filename from a URL path; fall back to a timestamped default
// when the URL has no recognisable file portion (e.g. trailing slash).
function filenameFromUrl(url: string): string {
  try {
    const u = new URL(url);
    const tail = basename(u.pathname);
    if (tail && tail !== '/' && tail !== '') return tail;
  } catch { /* fall through */ }
  return `download-${Date.now()}`;
}

// Download `url` and write it to outDir (default cwd). Returns the full
// path written. Creates the directory if missing.
export async function downloadUrl(url: string, opts: DownloadOptions = {}): Promise<string> {
  let res: Response;
  try {
    res = await fetch(url, { signal: timeoutSignal(DEFAULT_TRANSFER_TIMEOUT_MS) });
  } catch (e) {
    if (e instanceof Error && e.name === 'TimeoutError') {
      throw new Error(`Download timed out after ${resolveTimeout(DEFAULT_TRANSFER_TIMEOUT_MS)}ms: ${url} (set PIAPI_TIMEOUT_MS to override)`);
    }
    throw e;
  }
  if (!res.ok) throw new Error(`Download failed (${res.status}): ${url}`);

  const dir = opts.outDir ?? process.cwd();
  await mkdir(dir, { recursive: true });
  const finalPath = uniquePath(dir, filenameFromUrl(url));

  await writeFile(finalPath, Buffer.from(await res.arrayBuffer()));
  if (!opts.quiet) process.stderr.write(`Saved → ${finalPath}\n`);
  return finalPath;
}
