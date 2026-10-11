// Multipart assembly for the GPT-image edit endpoints (sync `/v1/images/edits`
// and async `/api/v1/images/edits/async`). Reference images are local files
// only, opt-in via the `@path` convention: URL references are rejected here
// rather than fetched or ephemeral-uploaded.
//
// Contract (https://piapi.ai/docs/gpt-image/gpt-image-api.md):
//   - one reference: file field `image`
//   - 1-16 references: repeat file field `image[]` in order (first = primary
//     subject; an optional `mask` applies to the first image)
//   - PNG / JPG / JPEG / WEBP, <= 25 MB each
//
// `validateImageEditInput` is the dry-run-safe half: pure shape checks, no IO.
// `buildImageEditForm` adds the disk checks and produces the FormData.

import { existsSync, lstatSync, readFileSync } from 'node:fs';
import { basename, extname, resolve as resolvePath } from 'node:path';
import { CLIError } from '../errors/base';
import { ExitCode } from '../errors/codes';
import type { ImageRequest } from '../client/openai-compat';

// Official limit is "25 MB" (decimal), not 25 MiB.
export const MAX_IMAGE_BYTES = 25_000_000;

const MIME_BY_EXTENSION: ReadonlyMap<string, string> = new Map([
  ['.png', 'image/png'],
  ['.jpg', 'image/jpeg'],
  ['.jpeg', 'image/jpeg'],
  ['.webp', 'image/webp'],
]);

function isAtPath(value: unknown): value is string {
  return typeof value === 'string' && value.startsWith('@') && value.length > 1;
}

function atPathOrThrow(value: unknown, field: string): string {
  if (!isAtPath(value)) {
    throw new CLIError(
      `${field} must be a local @file reference, got: ${JSON.stringify(value)}`,
      ExitCode.USAGE,
      `The image edit endpoints upload local files only. Prefix the path with @ (e.g. @./ref.png); URLs are not fetched or uploaded.`,
    );
  }
  return value;
}

export function validateImageEditInput(body: ImageRequest): void {
  const record = body as Record<string, unknown>;

  if (typeof record.prompt !== 'string' || record.prompt.trim() === '') {
    throw new CLIError('A non-empty prompt is required for image edits.', ExitCode.USAGE);
  }

  const image = record.image;
  if (Array.isArray(image)) {
    if (image.length < 1 || image.length > 16) {
      throw new CLIError(
        `image accepts 1 to 16 references, got ${image.length}.`,
        ExitCode.USAGE,
        `Pass a single @file or an ordered array of up to 16 @file references.`,
      );
    }
    for (const ref of image) atPathOrThrow(ref, 'image[]');
  } else if (image !== undefined && image !== null) {
    atPathOrThrow(image, 'image');
  } else {
    throw new CLIError(
      'An image reference is required for image edits.',
      ExitCode.USAGE,
      `Pass image=@file or image=[@file1, @file2, ...] (1-16 local references).`,
    );
  }

  if (record.mask !== undefined && record.mask !== null) {
    atPathOrThrow(record.mask, 'mask');
  }

  for (const [key, value] of Object.entries(record)) {
    if (key === 'image' || key === 'mask' || value === null || value === undefined) continue;
    if (typeof value === 'object') {
      throw new CLIError(
        `Nested values are not supported in image edit requests: ${key}`,
        ExitCode.USAGE,
        `Multipart form fields are scalars; only image may be an array.`,
      );
    }
  }
}

interface ImagePart {
  blob: Blob;
  filename: string;
}

function readImagePart(ref: string): ImagePart {
  const rawPath = ref.slice(1);
  const absPath = resolvePath(rawPath);

  if (!existsSync(absPath)) {
    throw new CLIError(
      `Local file not found: ${rawPath}`,
      ExitCode.USAGE,
      `The @ prefix uploads a local file. Check the path.`,
    );
  }

  // lstat (not stat) so symlinks themselves get rejected — same smuggling
  // concern as src/files/resolve.ts.
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

  const mime = MIME_BY_EXTENSION.get(extname(absPath).toLowerCase());
  if (!mime) {
    throw new CLIError(
      `Unsupported image format: ${rawPath}`,
      ExitCode.USAGE,
      `Allowed formats: PNG, JPG, JPEG, WEBP.`,
    );
  }

  if (st.size > MAX_IMAGE_BYTES) {
    throw new CLIError(
      `Image exceeds the 25 MB limit: ${rawPath} (${st.size} bytes)`,
      ExitCode.USAGE,
      `Resize or compress the reference below 25 MB.`,
    );
  }

  return { blob: new Blob([readFileSync(absPath)], { type: mime }), filename: basename(absPath) };
}

export async function buildImageEditForm(body: ImageRequest): Promise<FormData> {
  validateImageEditInput(body);
  const record = body as Record<string, unknown>;

  // Stat and read every reference up front so one bad file (missing, symlink,
  // oversize, wrong format) fails the whole batch before the caller's POST.
  const refs = (Array.isArray(record.image) ? record.image : [record.image]) as string[];
  const parts = refs.map(readImagePart);
  const maskPart = typeof record.mask === 'string' ? readImagePart(record.mask) : undefined;

  const form = new FormData();
  const field = Array.isArray(record.image) ? 'image[]' : 'image';
  for (const part of parts) form.append(field, part.blob, part.filename);
  if (maskPart) form.append('mask', maskPart.blob, maskPart.filename);

  for (const [key, value] of Object.entries(record)) {
    if (key === 'image' || key === 'mask' || value === null || value === undefined) continue;
    form.append(key, String(value));
  }

  return form;
}
