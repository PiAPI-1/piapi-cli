import { defineCommand } from '../../command';
import { resolveAPIKey } from '../../auth/resolver';
import { request } from '../../client/http';
import type { GlobalFlags } from '../../types/flags';
import { Progress } from '../../output/progress';
import { CLIError } from '../../errors/base';
import { ExitCode } from '../../errors/codes';

export default defineCommand({
  name: 'task cancel',
  description: 'Cancel a running task',
  usage: 'piapi task cancel <id>',
  async execute(config, flags: GlobalFlags) {
    const taskId = flags._positional?.[0];
    if (!taskId) throw new CLIError('Usage: piapi task cancel <id>', ExitCode.USAGE);

    const apiKey = resolveAPIKey(flags.apiKey) ?? config.apiKey;
    if (!apiKey) throw new CLIError('No API key. Run: piapi auth login --api-key sk-...', ExitCode.AUTH);

    const baseUrl = flags.baseUrl ?? config.baseUrl ?? 'https://api.piapi.ai';

    const spin = Progress.spin(`Cancelling task ${taskId}...`, flags);
    try {
      await request({
        method: 'POST',
        path: `/api/v1/task/${taskId}/cancel`,
        apiKey,
        baseUrl,
      });
      spin.stop();
      process.stderr.write(`Task ${taskId} cancelled.\n`);
    } catch (e) {
      spin.stop();
      throw e;
    }
  },
});
