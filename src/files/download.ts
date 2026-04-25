import { writeFileSync } from 'node:fs';
import { join } from 'node:path';

export interface DownloadOptions {
  outDir?: string;
  quiet?: boolean;
}

export async function downloadFile(url: string, destPath: string, opts: DownloadOptions = {}): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to download: ${res.statusText}`);

  const buffer = Buffer.from(await res.arrayBuffer());
  const finalPath = opts.outDir ? join(opts.outDir, destPath) : destPath;
  writeFileSync(finalPath, buffer);

  if (!opts.quiet) process.stderr.write(`Downloaded to ${finalPath}\n`);

  return finalPath;
}
