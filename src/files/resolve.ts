// Walk a parsed input and resolve every `@<path>` value into an
// uploaded ephemeral URL. The `@` convention (Replicate-style) is the
// explicit opt-in: bare strings are passed through untouched so we never
// accidentally try to upload arbitrary text that happens to look path-ish.
//
// Upload uses POST https://upload.theapi.app/api/ephemeral_resource —
// see src/files/upload.ts and https://piapi.ai/docs/tools/file-upload.md.

import { existsSync, lstatSync } from 'node:fs';
import { resolve as resolvePath } from 'node:path';
import { CLIError } from '../errors/base';
import { ExitCode } from '../errors/codes';

export interface UploadReport {
  key: string;       // input field that referenced the file (e.g. "image_url")
  path: string;      // resolved absolute path on disk
  url: string;       // ephemeral URL returned by PiAPI
}

export type Uploader = (path: string) => Promise<{ url: string; filename: string }>;

function isAtPath(value: unknown): value is string {
  return typeof value === 'string' && value.startsWith('@') && value.length > 1;
}

export async function resolveLocalFiles(
  input: Record<string, unknown>,
  uploader: Uploader,
): Promise<{ input: Record<string, unknown>; uploads: UploadReport[] }> {
  const out: Record<string, unknown> = { ...input };
  const uploads: UploadReport[] = [];

  for (const [key, value] of Object.entries(input)) {
    if (!isAtPath(value)) continue;

    const rawPath = value.slice(1);
    const absPath = resolvePath(rawPath);
    if (!existsSync(absPath)) {
      throw new CLIError(
        `Local file not found: ${rawPath}`,
        ExitCode.USAGE,
        `The @ prefix uploads a local file. Check the path or pass a URL directly.`,
      );
    }

    // lstat (not stat) so symlinks themselves get rejected — we don't want
    // an `@/dev/urandom` or `@/proc/self/mem` smuggled in via a symlink.
    const st = lstatSync(absPath);
    if (st.isSymbolicLink()) {
      throw new CLIError(
        `Refusing to upload symlink: ${rawPath}`,
        ExitCode.USAGE,
        `Pass the real file path instead of a symlink.`,
      );
    }
    if (!st.isFile()) {
      throw new CLIError(
        `Not a regular file: ${rawPath}`,
        ExitCode.USAGE,
        `Only plain files are uploadable (directories, devices, pipes are not).`,
      );
    }

    const result = await uploader(absPath);
    uploads.push({ key, path: absPath, url: result.url });
    out[key] = result.url;
  }

  return { input: out, uploads };
}
