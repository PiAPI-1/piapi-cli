import { defineCommand } from '../../command';
import { resolveAPIKey } from '../../auth/resolver';
import { getTask } from '../../client/unified';
import type { GlobalFlags } from '../../types/flags';
import { formatJSON } from '../../output/json';
import { Progress } from '../../output/progress';
import { CLIError } from '../../errors/base';
import { ExitCode } from '../../errors/codes';

export default defineCommand({
  name: 'task get',
  description: 'Get task details by ID',
  usage: 'piapi task get <id>',
  async execute(config, flags: GlobalFlags) {
    const taskId = flags._positional?.[0];
    if (!taskId) throw new CLIError('Usage: piapi task get <id>', ExitCode.USAGE);

    const apiKey = resolveAPIKey(flags.apiKey) ?? config.apiKey;
    if (!apiKey) throw new CLIError('No API key. Run: piapi auth login --api-key sk-...', ExitCode.AUTH);

    const baseUrl = flags.baseUrl ?? config.baseUrl ?? 'https://api.piapi.ai';

    const spin = Progress.spin(`Fetching task ${taskId}...`, flags);
    try {
      const data = await getTask({ apiKey, baseUrl }, taskId);
      spin.stop();
      process.stdout.write(formatJSON(data) + '\n');
    } catch (e) {
      spin.stop();
      throw e;
    }
  },
});
