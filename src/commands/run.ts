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
import type { GlobalFlags } from '../types/flags';
import type { CreateTaskRequest } from '../types/api';
import { getFormatter } from '../output/formatter';
import { formatJSON } from '../output/json';
import { withSpinner } from '../output/progress';
import { CLIError } from '../errors/base';
import { ExitCode } from '../errors/codes';

function extractUrls(value: unknown, path = ''): { label: string; url: string }[] {
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
  const res = await withSpinner(
    `Generating image (${model.name})…`,
    { quiet: flags.quiet },
    () => imageGeneration({ apiKey, baseUrl }, body),
  );
  const formatter = getFormatter(flags);
  if (formatter === 'json') {
    process.stdout.write(formatJSON(res) + '\n');
    return;
  }
  const urls = extractUrls(res.data);
  if (urls.length > 0) {
    for (const { label, url } of urls) process.stdout.write(`data${label}: ${url}\n`);
  } else {
    process.stdout.write(formatJSON(res) + '\n');
  }
  if (res.usage?.total_tokens) {
    process.stderr.write(`Usage: ${res.usage.total_tokens} tokens\n`);
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

  if (formatter === 'json') {
    process.stdout.write(formatJSON({ content: accumulated, usage }) + '\n');
    return;
  }

  if (accumulated.length > 0 && !accumulated.endsWith('\n')) process.stdout.write('\n');

  // Pull every http(s) URL out of the markdown blob, dedupe in order.
  const seen = new Set<string>();
  const urls: string[] = [];
  for (const m of accumulated.matchAll(/https?:\/\/[^\s)\]]+/g)) {
    const url = m[0]!.replace(/[.,;:!?]+$/, '');
    if (!seen.has(url)) { seen.add(url); urls.push(url); }
  }
  if (urls.length > 0) {
    process.stdout.write('\n');
    for (const url of urls) process.stdout.write(`url: ${url}\n`);
  }

  if (usage) {
    process.stderr.write(
      `Usage: ${usage.total_tokens} tokens (in ${usage.prompt_tokens}, out ${usage.completion_tokens})\n`,
    );
  }
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
      'Creating task...',
      { quiet: flags.quiet },
      () => createTask({ apiKey, baseUrl }, req),
    );
    const formatter = getFormatter(flags);
    if (formatter === 'json') {
      process.stdout.write(formatJSON({ task_id: task.task_id, status: task.status }) + '\n');
    } else {
      process.stdout.write(`Task created: ${task.task_id} (${task.status})\n`);
      process.stdout.write(`Check status: piapi task get ${task.task_id}\n`);
    }
    return;
  }

  const created = await withSpinner(
    'Creating task...',
    { quiet: flags.quiet },
    () => createTask({ apiKey, baseUrl }, req),
  );
  const taskId = created.task_id;

  const finalTask = await pollTask(
    async () => getTask({ apiKey, baseUrl }, taskId),
    (t) => t.status === 'completed' || t.status === 'failed',
    {
      quiet: flags.quiet,
      label: `Running ${model.name}…`,
      getStatus: (t) => t.status,
    },
  );

  const formatter = getFormatter(flags);
  if (formatter === 'json') {
    process.stdout.write(formatJSON(finalTask) + '\n');
    return;
  }

  if (finalTask.status !== 'completed') {
    const err = finalTask.error?.message || finalTask.error?.raw_message || 'unknown error';
    throw new CLIError(`Task ${taskId} failed: ${err}`, ExitCode.API_ERROR);
  }

  process.stdout.write(`Task ${taskId} completed.\n`);
  const out = finalTask.output;
  // Output schema varies per model (image_url, video, model_file, works[].audio…).
  // Walk the tree and print every http(s) URL with its key path; fall back to
  // raw JSON if no URLs found so the user still sees the result.
  const urls = extractUrls(out);
  if (urls.length > 0) {
    for (const { label, url } of urls) process.stdout.write(`${label}: ${url}\n`);
  } else if (out) {
    process.stdout.write(formatJSON(out) + '\n');
  }
  if (finalTask.meta?.usage) {
    process.stderr.write(`Usage: ${finalTask.meta.usage.consume} ${finalTask.meta.usage.type}s\n`);
  }
}

export default defineCommand({
  name: 'run',
  description: 'Run a model task',
  usage: 'piapi run <model> key=value... [--async] [--dry-run]',
  examples: [
    'piapi run flux-dev prompt="a corgi" aspect_ratio=16:9',
    'piapi run gpt-image-2 prompt="a robot" size=1024x1024',
    'piapi run gpt-4o prompt="explain async/await in JS"',
    'piapi run claude-opus-4.6 prompt="rewrite this" --stream',
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
    const input = { ...(model.defaultInput ?? {}), ...userInput };

    const baseUrl = flags.baseUrl ?? config.baseUrl ?? 'https://api.piapi.ai';

    // Resolve API key only when actually executing (dry-run paths don't need it).
    let apiKey = '';
    if (!flags.dryRun) {
      apiKey = resolveAPIKey(flags.apiKey) ?? config.apiKey ?? '';
      if (!apiKey) {
        throw new CLIError('No API key. Run: piapi auth login --api-key sk-...', ExitCode.AUTH);
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

    if (flags.dryRun) process.exit(0);
  },
});
