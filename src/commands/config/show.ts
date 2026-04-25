import { defineCommand } from '../../command';
import { readConfigFile } from '../../config/loader';
import type { GlobalFlags } from '../../types/flags';
import { getFormatter } from '../../output/formatter';
import { formatJSON } from '../../output/json';

export default defineCommand({
  name: 'config show',
  description: 'Show current configuration',
  async execute(_config, flags: GlobalFlags) {
    const cfg = readConfigFile();
    const formatter = getFormatter(flags);

    if (formatter === 'json') {
      process.stdout.write(formatJSON(cfg) + '\n');
    } else {
      process.stdout.write(`base_url: ${cfg.baseUrl ?? 'https://api.piapi.ai'}\n`);
      process.stdout.write(`api_key: ${cfg.apiKey ? `${cfg.apiKey.slice(0, 8)}...` : '(not set)'}\n`);
    }
  },
});
