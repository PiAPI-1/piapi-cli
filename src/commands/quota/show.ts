import { defineCommand } from '../../command';
import { resolveAPIKey } from '../../auth/resolver';
import { getAccountInfo } from '../../client/unified';
import type { GlobalFlags } from '../../types/flags';
import { getFormatter } from '../../output/formatter';
import { formatJSON } from '../../output/json';
import { withSpinner } from '../../output/progress';
import { renderQuotaPanel } from '../../output/quota-panel';
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

    const data = await withSpinner(
      'Fetching account info…',
      { quiet: flags.quiet },
      () => getAccountInfo({ apiKey, baseUrl }),
    );

    const formatter = getFormatter(flags);
    if (formatter === 'json') {
      process.stdout.write(formatJSON(data) + '\n');
      return;
    }
    renderQuotaPanel(data);
  },
});
