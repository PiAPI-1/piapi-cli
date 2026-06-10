import { defineCommand } from '../../command';
import { resolveAPIKey } from '../../auth/resolver';
import { getTask } from '../../client/unified';
import type { GlobalFlags } from '../../types/flags';
import { isTerminalStatus } from '../../types/api';
import { pollTask } from '../../polling/poll';
import { renderUnifiedResult } from '../../output/task-result';
import { CLIError } from '../../errors/base';
import { ExitCode } from '../../errors/codes';

// Completes the --async / asyncOnly loop: poll a task until it reaches a
// terminal status, then render exactly like a synchronous `piapi run` —
// same URLs/JSON output, same exit codes, same --download behaviour.
export default defineCommand({
  name: 'task wait',
  description: 'Wait for a task to finish and print its result',
  usage: 'piapi task wait <id> [--timeout <seconds>] [--download]',
  examples: [
    'piapi task wait 7a1f…',
    'piapi task wait 7a1f… --download --out-dir ./renders',
    'piapi task wait 7a1f… --timeout 1200',
  ],
  async execute(config, flags: GlobalFlags) {
    const taskId = flags._positional?.[0];
    if (!taskId) throw new CLIError('Usage: piapi task wait <id>', ExitCode.USAGE);

    const apiKey = resolveAPIKey(flags.apiKey) ?? config.apiKey;
    if (!apiKey) throw new CLIError('No API key. Run: piapi auth login --api-key sk-...', ExitCode.AUTH);

    const baseUrl = flags.baseUrl ?? config.baseUrl ?? 'https://api.piapi.ai';

    const t0 = Date.now();
    const finalTask = await pollTask(
      () => getTask({ apiKey, baseUrl }, taskId),
      (t) => isTerminalStatus(t.status),
      {
        quiet: flags.quiet,
        timeout: typeof flags.timeout === 'number' && flags.timeout > 0 ? flags.timeout * 1000 : undefined,
        label: `Waiting for task ${taskId}…`,
        getStatus: (t) => t.status,
        resumeCommand: `piapi task wait ${taskId}`,
      },
    );

    await renderUnifiedResult(finalTask, {
      title: finalTask.model ?? taskId,
      elapsedMs: Date.now() - t0,
      flags,
    });
  },
});
