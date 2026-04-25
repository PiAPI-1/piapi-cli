import { existsSync } from 'node:fs';
import { defineCommand } from '../../command';
import { readConfigFile } from '../../config/loader';
import { CONFIG_FILE } from '../../config/paths';
import { DEFAULT_BASE_URL } from '../../config/schema';
import type { GlobalFlags } from '../../types/flags';
import { getFormatter } from '../../output/formatter';
import { formatJSON } from '../../output/json';
import { ANSI, colorEnabled } from '../../output/color';
import { maskToken, tildePath } from '../../output/format-helpers';

export default defineCommand({
  name: 'config show',
  description: 'Show current configuration',
  async execute(_config, flags: GlobalFlags) {
    const cfg = readConfigFile();
    const formatter = getFormatter(flags);

    if (formatter === 'json') {
      process.stdout.write(formatJSON(cfg) + '\n');
      return;
    }

    const useColor = colorEnabled(process.stdout);
    const { reset, bold, dim, blue } = ANSI;
    const path    = existsSync(CONFIG_FILE) ? tildePath(CONFIG_FILE) : '(no config file)';
    const baseUrl = cfg.baseUrl ?? DEFAULT_BASE_URL;
    const baseTag = cfg.baseUrl ? '' : ' (default)';
    const keyStr  = cfg.apiKey ? maskToken(cfg.apiKey) : '(not set)';

    if (!useColor) {
      process.stdout.write(`config  ${path}\n`);
      process.stdout.write(`  base_url  ${baseUrl}${baseTag}\n`);
      process.stdout.write(`  api_key   ${keyStr}\n`);
      return;
    }

    process.stdout.write(`${bold}${blue}config${reset}  ${dim}${path}${reset}\n`);
    process.stdout.write(`  ${dim}base_url${reset}  ${baseUrl}${dim}${baseTag}${reset}\n`);
    process.stdout.write(`  ${dim}api_key${reset}   ${cfg.apiKey ? `${bold}${keyStr}${reset}` : `${dim}${keyStr}${reset}`}\n`);
  },
});
