import { defineCommand } from '../command';
import { resolveAPIKey } from '../auth/resolver';
import { getModel } from '../models/catalog';
import type { ModelEntry } from '../models/catalog';
import { parseInput } from '../models/input-parser';
import { createTask, getTask } from '../client/unified';
import {
  chatCompletion,
  chatCompletionStream,
  imageGeneration,
  type ChatMessage,
  type ChatRequest,
  type ChatUsage,
  type ImageRequest,
} from '../client/openai-compat';
import { pollTask } from '../polling/poll';
import { uploadFile } from '../files/upload';
import { resolveLocalFiles } from '../files/resolve';
import { saveBase64 } from '../files/download';
import type { GlobalFlags } from '../types/flags';
import { isTerminalStatus, type CreateTaskRequest } from '../types/api';
import { getFormatter } from '../output/formatter';
import { formatJSON } from '../output/json';
import { withSpinner } from '../output/progress';
import { printRunSuccess, printRunPending } from '../output/run-status';
import { extractUrls, maybeDownload, renderUnifiedResult } from '../output/task-result';
import { CLIError } from '../errors/base';
import { ExitCode } from '../errors/codes';

// Map CLI key=value args into OpenAI chat/completions body.
// Convention:
//   prompt="…"           → messages: [{role:'user', content:'…'}]
//   system="…"           → prepend {role:'system', content:'…'}
//   messages=@chat.json  → use as-is (advanced; preparsed by input-parser)
function buildChatBody(model: string, input: Record<string, unknown>): ChatRequest {
  const { prompt, system, messages, ...rest } = input;
  let msgs: ChatMessage[];
  if (Array.isArray(messages)) {
    msgs = messages as ChatMessage[];
  } else {
    if (typeof prompt !== 'string' || !prompt) {
      throw new CLIError(
        `LLM models require either prompt="…" or messages=@file.json.`,
        ExitCode.USAGE,
      );
    }
    msgs = [];
    if (typeof system === 'string' && system) msgs.push({ role: 'system', content: system });
    msgs.push({ role: 'user', content: prompt });
  }
  return { model, messages: msgs, ...rest };
}

function buildImageBody(model: string, input: Record<string, unknown>): ImageRequest {
  const { prompt, ...rest } = input;
  if (typeof prompt !== 'string' || !prompt) {
    throw new CLIError(`Image models require prompt="…".`, ExitCode.USAGE);
  }
  return { model, prompt, ...rest };
}

async function runOpenAIImage(
  model: ModelEntry,
  input: Record<string, unknown>,
  apiKey: string,
  baseUrl: string,
  flags: GlobalFlags,
): Promise<void> {
  const body = buildImageBody(model.model, input);
  if (flags.dryRun) {
    process.stderr.write(`[DRY RUN] POST ${baseUrl}/v1/images/generations\n`);
    process.stderr.write(`[DRY RUN] Body: ${formatJSON(body)}\n`);
    return;
  }
  const t0 = Date.now();
  const res = await withSpinner(
    `Generating image (${model.name})…`,
    { quiet: flags.quiet },
    () => imageGeneration({ apiKey, baseUrl }, body),
  );
  const formatter = getFormatter(flags);
  const urls = extractUrls(res.data);
  // gpt-image-2 with reference image input returns base64 inline (b64_json)
  // instead of a URL — capture both modes so --download works either way.
  const b64Items = (res.data ?? [])
    .map((d, i) => ({ index: i, b64: d.b64_json }))
    .filter((x): x is { index: number; b64: string } => typeof x.b64 === 'string' && x.b64.length > 0);

  if (formatter === 'json') {
    process.stdout.write(formatJSON(res) + '\n');
  } else {
    printRunSuccess({
      title: model.name,
      elapsedMs: Date.now() - t0,
      extra: res.usage?.total_tokens ? `${res.usage.total_tokens} tokens` : undefined,
    });
    if (urls.length > 0) {
      for (const { label, url } of urls) process.stdout.write(`data${label}: ${url}\n`);
    } else if (b64Items.length > 0) {
      for (const { index, b64 } of b64Items) {
        process.stdout.write(`data[${index}].b64_json: <${Math.round(b64.length * 3 / 4 / 1024)} KB>\n`);
      }
    } else {
      process.stdout.write(formatJSON(res) + '\n');
    }
  }
  await maybeDownload(urls.map((u) => u.url), flags);
  if (flags.download && b64Items.length > 0) {
    for (const { index, b64 } of b64Items) {
      try {
        await saveBase64(b64, `${model.name}-${Date.now()}-${index}.png`, {
          outDir: flags.outDir, quiet: flags.quiet,
        });
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        process.stderr.write(`Save base64 failed (#${index}): ${msg}\n`);
      }
    }
  }
}

async function runOpenAIChat(
  model: ModelEntry,
  input: Record<string, unknown>,
  apiKey: string,
  baseUrl: string,
  flags: GlobalFlags,
): Promise<void> {
  const body = buildChatBody(model.model, input);
  // streamingOnly is a model property (sora2-preview forces stream=true);
  // --stream is a user opt-in for any openai-completions model.
  const useStream = model.streamingOnly === true || flags.stream === true;

  if (flags.dryRun) {
    const path = '/v1/chat/completions';
    const dryBody = useStream ? { ...body, stream: true } : body;
    process.stderr.write(`[DRY RUN] POST ${baseUrl}${path}\n`);
    process.stderr.write(`[DRY RUN] Body: ${formatJSON(dryBody)}\n`);
    return;
  }

  if (useStream) {
    await runOpenAIChatStream(model, body, apiKey, baseUrl, flags);
    return;
  }

  const res = await withSpinner(
    `${model.name}…`,
    { quiet: flags.quiet },
    () => chatCompletion({ apiKey, baseUrl }, body),
  );
  const formatter = getFormatter(flags);
  if (formatter === 'json') {
    process.stdout.write(formatJSON(res) + '\n');
    return;
  }
  const content = res.choices?.[0]?.message?.content ?? '';
  process.stdout.write(content + (content.endsWith('\n') ? '' : '\n'));
  if (res.usage) {
    process.stderr.write(
      `Usage: ${res.usage.total_tokens} tokens (in ${res.usage.prompt_tokens}, out ${res.usage.completion_tokens})\n`,
    );
  }
}

// PiAPI's sora2-preview wraps video generation as a streamed chat
// completion: the assistant message is markdown narrating progress and
// ends with the final video URL embedded as `[Play▶️](https://...mp4)`.
// Stream chunks straight to stdout (TTY) so the user sees progress as it
// arrives, then extract every URL from the accumulated content at the
// end and print them on dedicated lines for easy copy-paste / grepping.
async function runOpenAIChatStream(
  _model: ModelEntry,
  body: ChatRequest,
  apiKey: string,
  baseUrl: string,
  flags: GlobalFlags,
): Promise<void> {
  const formatter = getFormatter(flags);
  let accumulated = '';
  let usage: ChatUsage | undefined;

  for await (const ev of chatCompletionStream({ apiKey, baseUrl }, body)) {
    if (ev.type === 'delta') {
      accumulated += ev.content;
      if (formatter !== 'json' && !flags.quiet) process.stdout.write(ev.content);
    } else if (ev.type === 'usage') {
      usage = ev.usage;
    }
  }

  // PiAPI's streamed completions sometimes ship an empty {} usage chunk.
  // Treat usage as present only if at least total_tokens looks like a number.
  const hasUsage = typeof usage?.total_tokens === 'number';

  // Pull every http(s) URL out of the markdown blob, dedupe in order.
  const seen = new Set<string>();
  const urls: string[] = [];
  for (const m of accumulated.matchAll(/https?:\/\/[^\s)\]]+/g)) {
    const url = m[0]!.replace(/[.,;:!?]+$/, '');
    if (!seen.has(url)) { seen.add(url); urls.push(url); }
  }

  if (formatter === 'json') {
    process.stdout.write(formatJSON({ content: accumulated, urls, usage: hasUsage ? usage : undefined }) + '\n');
  } else {
    if (accumulated.length > 0 && !accumulated.endsWith('\n')) process.stdout.write('\n');
    if (urls.length > 0) {
      process.stdout.write('\n');
      for (const url of urls) process.stdout.write(`url: ${url}\n`);
    }
    if (hasUsage && usage) {
      process.stderr.write(
        `Usage: ${usage.total_tokens} tokens (in ${usage.prompt_tokens}, out ${usage.completion_tokens})\n`,
      );
    }
  }
  await maybeDownload(urls, flags);
}

async function runUnified(
  model: ModelEntry,
  input: Record<string, unknown>,
  apiKey: string,
  baseUrl: string,
  flags: GlobalFlags,
): Promise<void> {
  if (!model.taskType) {
    throw new CLIError(`Model ${model.name} has no taskType (catalog bug).`, ExitCode.INTERNAL);
  }
  const req: CreateTaskRequest = {
    model: model.model,
    task_type: model.taskType,
    input,
    ...(flags.webhook ? { config: { webhook_config: { endpoint: flags.webhook } } } : {}),
  };

  if (flags.dryRun) {
    process.stderr.write(`[DRY RUN] POST ${baseUrl}/api/v1/task\n`);
    process.stderr.write(`[DRY RUN] Body: ${formatJSON(req)}\n`);
    return;
  }

  if (flags.async || model.asyncOnly) {
    const task = await withSpinner(
      'Creating task…',
      { quiet: flags.quiet },
      () => createTask({ apiKey, baseUrl }, req),
    );
    const formatter = getFormatter(flags);
    if (formatter === 'json') {
      process.stdout.write(formatJSON({ task_id: task.task_id, status: task.status }) + '\n');
    } else {
      printRunPending({
        title: model.name,
        taskId: task.task_id,
        status: task.status,
        hint: `piapi task get ${task.task_id}`,
      });
    }
    return;
  }

  const t0 = Date.now();
  const created = await withSpinner(
    'Creating task…',
    { quiet: flags.quiet },
    () => createTask({ apiKey, baseUrl }, req),
  );
  const taskId = created.task_id;

  const finalTask = await pollTask(
    async () => getTask({ apiKey, baseUrl }, taskId),
    (t) => isTerminalStatus(t.status),
    {
      quiet: flags.quiet,
      label: `Running ${model.name}…`,
      getStatus: (t) => t.status,
    },
  );

  await renderUnifiedResult(finalTask, {
    title: model.name,
    elapsedMs: Date.now() - t0,
    flags,
  });
}

export default defineCommand({
  name: 'run',
  description: 'Run a model task',
  usage: 'piapi run <model> key=value... [--async] [--dry-run]',
  examples: [
    'piapi run flux-dev prompt="a corgi" aspect_ratio=16:9',
    'piapi run gpt-image-2 prompt="a robot" size=1024x1024',
    'piapi run gpt-4o prompt="explain async/await in JS"',
    'piapi run claude-sonnet-4.6 prompt="rewrite this" --stream',
    'piapi run sora2-pro prompt="a sunset" --async',
    'piapi run flux-dev prompt="test" --dry-run',
  ],
  async execute(config, flags: GlobalFlags) {
    const modelName = flags._positional?.[0];
    if (!modelName) throw new CLIError('Usage: piapi run <model> key=value...', ExitCode.USAGE);

    const model = getModel(modelName);
    if (!model) throw new CLIError(
      `Unknown model: ${modelName}. Run "piapi model list" for available models.`,
      ExitCode.USAGE,
    );

    const kvArgs = (flags._positional ?? []).slice(1);
    const userInput = parseInput(kvArgs);
    let input = { ...(model.defaultInput ?? {}), ...userInput };

    const baseUrl = flags.baseUrl ?? config.baseUrl ?? 'https://api.piapi.ai';

    // Resolve API key only when actually executing (dry-run paths don't need it).
    let apiKey = '';
    if (!flags.dryRun) {
      apiKey = resolveAPIKey(flags.apiKey) ?? config.apiKey ?? '';
      if (!apiKey) {
        throw new CLIError('No API key. Run: piapi auth login --api-key sk-...', ExitCode.AUTH);
      }
    }

    // Auto-upload `@<path>` values to PiAPI's ephemeral resource endpoint
    // and rewrite the input with the returned URLs. Skipped in dry-run so
    // users can see the request shape without consuming credits or network.
    if (!flags.dryRun) {
      try {
        const resolved = await resolveLocalFiles(input, async (p) => {
          return withSpinner(
            `Uploading ${p.split('/').pop()}…`,
            { quiet: flags.quiet },
            () => uploadFile(apiKey, p),
          );
        });
        input = resolved.input;
        if (!flags.quiet && resolved.uploads.length > 0) {
          for (const u of resolved.uploads) {
            process.stderr.write(`Uploaded ${u.path} → ${u.url}\n`);
          }
        }
      } catch (e) {
        if (e instanceof CLIError) throw e;
        const msg = e instanceof Error ? e.message : String(e);
        // Surface the common "plan not allowed" 403 as a usage error with a
        // concrete next step rather than a raw exception trace.
        if (/not allowed|plan|upgrade/i.test(msg)) {
          throw new CLIError(msg, ExitCode.AUTH,
            `File upload requires a paid PiAPI plan. Upload to your own bucket and pass the URL as image_url=https://… instead.`);
        }
        throw new CLIError(`Upload failed: ${msg}`, ExitCode.NETWORK);
      }
    }

    const apiType = model.apiType ?? 'unified';
    if (apiType === 'openai-images') {
      await runOpenAIImage(model, input, apiKey, baseUrl, flags);
    } else if (apiType === 'openai-completions') {
      await runOpenAIChat(model, input, apiKey, baseUrl, flags);
    } else {
      await runUnified(model, input, apiKey, baseUrl, flags);
    }
  },
});
