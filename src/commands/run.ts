import { defineCommand } from '../command';
import { resolveAPIKey } from '../auth/resolver';
import { getModel } from '../models/catalog';
import { parseInput } from '../models/input-parser';
import { createTask, getTask } from '../client/unified';
import { pollTask } from '../polling/poll';
import type { GlobalFlags } from '../types/flags';
import type { CreateTaskRequest } from '../types/api';
import { getFormatter } from '../output/formatter';
import { formatJSON } from '../output/json';
import { Progress } from '../output/progress';
import { CLIError } from '../errors/base';
import { ExitCode } from '../errors/codes';

export default defineCommand({
  name: 'run',
  description: 'Run a model task',
  usage: 'piapi run <model> key=value... [--async] [--dry-run]',
  examples: [
    'piapi run flux-dev prompt="a corgi" aspect_ratio=16:9',
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

    // Parse key=value args, then merge defaultInput (user values win)
    const kvArgs = (flags._positional ?? []).slice(1);
    const userInput = parseInput(kvArgs);
    const input = { ...(model.defaultInput ?? {}), ...userInput };

    const baseUrl = flags.baseUrl ?? config.baseUrl ?? 'https://api.piapi.ai';
    const req: CreateTaskRequest = {
      model: model.model,
      task_type: model.taskType,
      input,
      ...(flags.webhook ? { config: { webhook_config: { endpoint: flags.webhook } } } : {}),
    };

    // Dry-run: print request without executing (no API key needed)
    if (flags.dryRun) {
      process.stderr.write(`[DRY RUN] POST ${baseUrl}/api/v1/task\n`);
      process.stderr.write(`[DRY RUN] Body: ${formatJSON(req)}\n`);
      process.exit(0);
    }

    // Real execution requires API key
    const apiKey = resolveAPIKey(flags.apiKey) ?? config.apiKey;
    if (!apiKey) throw new CLIError(
      'No API key. Run: piapi auth login --api-key sk-...',
      ExitCode.AUTH,
    );

    // Async mode: just create and return task ID
    if (flags.async || model.asyncOnly) {
      const spin = Progress.spin('Creating task...', flags);
      try {
        const task = await createTask({ apiKey, baseUrl }, req);
        spin.stop();
        const formatter = getFormatter(flags);
        if (formatter === 'json') {
          process.stdout.write(formatJSON({ task_id: task.task_id, status: task.status }) + '\n');
        } else {
          process.stdout.write(`Task created: ${task.task_id} (${task.status})\n`);
          process.stdout.write(`Check status: piapi task get ${task.task_id}\n`);
        }
      } catch (e) { spin.stop(); throw e; }
      return;
    }

    // Sync mode: create task and poll until done
    const spin = Progress.spin('Creating task...', flags);
    let taskId: string;
    try {
      const task = await createTask({ apiKey, baseUrl }, req);
      taskId = task.task_id;
      spin.stop();
    } catch (e) { spin.stop(); throw e; }

    const finalTask = await pollTask(
      async () => getTask({ apiKey, baseUrl }, taskId),
      (t) => t.status === 'completed' || t.status === 'failed',
      { quiet: flags.quiet },
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
    if (out?.image_url) process.stdout.write(`Image: ${out.image_url}\n`);
    if (out?.image_urls?.length) {
      for (const url of out.image_urls) process.stdout.write(`Image: ${url}\n`);
    }
    if (out?.video_url) process.stdout.write(`Video: ${out.video_url}\n`);
    if (out?.audio_url) process.stdout.write(`Audio: ${out.audio_url}\n`);
    // Fall back to full JSON when no recognised media field present
    if (out && !out.image_url && !out.image_urls && !out.video_url && !out.audio_url) {
      process.stdout.write(formatJSON(out) + '\n');
    }
    if (finalTask.meta?.usage) {
      process.stderr.write(`Usage: ${finalTask.meta.usage.consume} ${finalTask.meta.usage.type}s\n`);
    }
  },
});
