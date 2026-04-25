import { defineCommand } from '../../command';
import { resolveAPIKey } from '../../auth/resolver';
import { getAccountInfo } from '../../client/unified';
import type { GlobalFlags } from '../../types/flags';
import { getFormatter } from '../../output/formatter';
import { formatJSON } from '../../output/json';
import { Progress } from '../../output/progress';
import type { AccountInfo } from '../../types/api';
import { CLIError } from '../../errors/base';
import { ExitCode } from '../../errors/codes';

export default defineCommand({
  name: 'quota show',
  description: 'Show account quota and remaining credits',
  async execute(config, flags: GlobalFlags) {
    const apiKey = resolveAPIKey(flags.apiKey) ?? config.apiKey;
    if (!apiKey) throw new CLIError('No API key. Run: piapi auth login --api-key sk-...', ExitCode.AUTH);

    const baseUrl = flags.baseUrl ?? config.baseUrl ?? 'https://api.piapi.ai';

    if (flags.dryRun) {
      process.stderr.write(`[DRY RUN] Would call GET ${baseUrl}/account/info\n`);
      process.exit(0);
    }

    const spin = Progress.spin('Fetching account info...', flags);

    try {
      const data = await getAccountInfo({ apiKey, baseUrl }) as AccountInfo;
      spin.stop();

      const formatter = getFormatter(flags);
      if (formatter === 'json') {
        process.stdout.write(formatJSON(data) + '\n');
      } else {
        process.stdout.write(`Account: ${data.account_name ?? data.account_id}\n`);
        process.stdout.write(`Remaining credits: ${data.remaining_credits}\n`);
        if (data.quota_used !== undefined) process.stdout.write(`Quota used: ${data.quota_used}\n`);
      }
    } catch (e) {
      spin.stop();
      throw e;
    }
  },
});
