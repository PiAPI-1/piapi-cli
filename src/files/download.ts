import { mkdir, writeFile } from 'node:fs/promises';
import { basename, join } from 'node:path';

export interface DownloadOptions {
  outDir?: string;
  quiet?: boolean;
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
  const finalPath = join(dir, name);
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
// path written. Creates the directory if missing. On collision we keep
// it simple and overwrite — the caller can pre-flight if they care.
export async function downloadUrl(url: string, opts: DownloadOptions = {}): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Download failed (${res.status}): ${url}`);

  const dir = opts.outDir ?? process.cwd();
  await mkdir(dir, { recursive: true });
  const filename = filenameFromUrl(url);
  const finalPath = join(dir, filename);

  await writeFile(finalPath, Buffer.from(await res.arrayBuffer()));
  if (!opts.quiet) process.stderr.write(`Saved → ${finalPath}\n`);
  return finalPath;
}
