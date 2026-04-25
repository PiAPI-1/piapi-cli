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
        process.stdout.write(`Account: ${data.name ?? `#${data.id}`}\n`);
        if (data.plan) process.stdout.write(`Plan: ${data.plan}\n`);
        const cp = data.credit_pack_info;
        if (cp) {
          process.stdout.write(`Available credits: ${cp.available_credits.toLocaleString()}\n`);
          process.stdout.write(`Used credits: ${cp.used_credits.toLocaleString()}\n`);
          if (cp.total_credits !== undefined) {
            process.stdout.write(`Total credits: ${cp.total_credits.toLocaleString()}\n`);
          }
        }
        if (data.equivalent_in_usd !== undefined) {
          process.stdout.write(`Equivalent: $${data.equivalent_in_usd.toFixed(2)} USD\n`);
        }
      }
    } catch (e) {
      spin.stop();
      throw e;
    }
  },
});
