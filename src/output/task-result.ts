// Shared rendering for finished unified-API tasks. Used by `run` (sync
// polling path) and `task wait` so both produce identical output, exit
// codes, and --download behaviour in text and JSON modes.

import type { TaskData } from '../types/api';
import type { GlobalFlags } from '../types/flags';
import { getFormatter } from './formatter';
import { formatJSON } from './json';
import { printRunSuccess } from './run-status';
import { downloadUrl, saveBase64 } from '../files/download';
import { CLIError } from '../errors/base';
import { ExitCode } from '../errors/codes';

export function extractUrls(value: unknown, path = ''): { label: string; url: string }[] {
  if (value == null) return [];
  if (typeof value === 'string') {
    return /^https?:\/\//.test(value) ? [{ label: path || 'url', url: value }] : [];
  }
  if (Array.isArray(value)) {
    return value.flatMap((v, i) => extractUrls(v, `${path}[${i}]`));
  }
  if (typeof value === 'object') {
    return Object.entries(value as Record<string, unknown>).flatMap(([k, v]) =>
      extractUrls(v, path ? `${path}.${k}` : k),
    );
  }
  return [];
}

// Walk the (possibly URL-bearing) results and download each one when the
// user passed --download. Best-effort: a single download failure logs to
// stderr but does not abort the rest of the batch — partial saves are
// still useful, and the URLs themselves remain visible in stdout.
export async function maybeDownload(urls: string[], flags: GlobalFlags): Promise<void> {
  if (!flags.download || urls.length === 0) return;
  const dedup = [...new Set(urls)];
  for (const url of dedup) {
    try {
      await downloadUrl(url, { outDir: flags.outDir, quiet: flags.quiet });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      process.stderr.write(`Download failed: ${url} (${msg})\n`);
    }
  }
}

// OpenAI-shaped async outputs use output.data[].b64_json rather than URLs.
function imagePayloads(output: TaskData['output']): { index: number; b64: string }[] {
  if (!Array.isArray(output?.data)) return [];
  return output.data.flatMap((item: unknown, index: number) => {
    if (item === null || typeof item !== 'object') return [];
    const b64 = (item as Record<string, unknown>).b64_json;
    return typeof b64 === 'string' && b64.length > 0 ? [{ index, b64 }] : [];
  });
}

function imageFailure(output: TaskData['output']): string | undefined {
  const body = output?.error_body;
  if (typeof body === 'string') return body;
  if (body === null || typeof body !== 'object') return undefined;
  const record = body as Record<string, unknown>;
  const error = record.error;
  const message = error && typeof error === 'object'
    ? (error as Record<string, unknown>).message : record.message;
  return typeof message === 'string' ? message : undefined;
}

export interface RenderTaskOpts {
  title: string;
  elapsedMs?: number;
  flags: GlobalFlags;
}

// Render a terminal-status task. JSON mode prints the raw task to stdout
// first so consumers always get the body, THEN throws on failure — the
// error (and exit code) goes to stderr, the data stays parseable.
// --download applies in both output modes.
export async function renderUnifiedResult(task: TaskData, opts: RenderTaskOpts): Promise<void> {
  const { title, elapsedMs, flags } = opts;
  const formatter = getFormatter(flags);

  if (formatter === 'json') {
    process.stdout.write(formatJSON(task) + '\n');
  }

  if (task.status === 'cancelled') {
    throw new CLIError(`Task ${task.task_id} was cancelled.`, ExitCode.API_ERROR);
  }
  if (task.status !== 'completed') {
    const err = task.error?.message || task.error?.raw_message || imageFailure(task.output) || 'unknown error';
    throw new CLIError(`Task ${task.task_id} failed: ${err}`, ExitCode.API_ERROR);
  }

  const out = task.output;
  // Output schema varies per model (image_url, video, model_file, works[].audio…).
  // Walk the tree and print every http(s) URL with its key path; fall back to
  // raw JSON if no URLs found so the user still sees the result.
  const urls = extractUrls(out);
  const images = imagePayloads(out);

  if (formatter !== 'json') {
    const usage = task.meta?.usage;
    printRunSuccess({
      title,
      elapsedMs,
      extra: usage ? `${usage.consume} ${usage.type}s` : undefined,
    });
    if (urls.length > 0) {
      for (const { label, url } of urls) process.stdout.write(`${label}: ${url}\n`);
    } else if (images.length > 0) {
      for (const { index, b64 } of images) {
        process.stdout.write(`data[${index}].b64_json: <${Math.round(b64.length * 3 / 4 / 1024)} KB>\n`);
      }
    } else if (out) {
      process.stdout.write(formatJSON(out) + '\n');
    }
  }

  await maybeDownload(urls.map((u) => u.url), flags);
  if (flags.download) {
    for (const { index, b64 } of images) {
      try {
        // Stable safe basename plus uniquePath prevents overwrites across waits.
        await saveBase64(b64, `image-${index}.png`, { outDir: flags.outDir, quiet: flags.quiet });
      } catch (e) {
        process.stderr.write(`Save base64 failed (#${index}): ${e instanceof Error ? e.message : String(e)}\n`);
      }
    }
  }
}
