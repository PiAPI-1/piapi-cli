import { existsSync } from 'node:fs';
import { defineCommand } from '../../command';
import { isLoggedIn } from '../../auth/status';
import type { GlobalFlags } from '../../types/flags';
import { getFormatter } from '../../output/formatter';
import { formatJSON } from '../../output/json';
import { ANSI, colorEnabled } from '../../output/color';
import { maskToken, tildePath } from '../../output/format-helpers';
import { CONFIG_FILE } from '../../config/paths';

export default defineCommand({
  name: 'auth status',
  description: 'Check if you are logged in',
  async execute(config, flags: GlobalFlags) {
    const loggedIn = isLoggedIn();
    const formatter = getFormatter(flags);

    if (formatter === 'json') {
      process.stdout.write(formatJSON({ logged_in: loggedIn, api_key_set: !!config.apiKey }) + '\n');
      return;
    }

    const useColor = colorEnabled(process.stdout);
    const { reset, bold, dim, green, red } = ANSI;

    if (loggedIn && config.apiKey) {
      const tick   = useColor ? `${green}✓${reset}` : '✓';
      const masked = maskToken(config.apiKey);
      const path   = existsSync(CONFIG_FILE) ? tildePath(CONFIG_FILE) : '(no config file)';
      const keyPart  = useColor ? `${bold}${masked}${reset}` : masked;
      const pathPart = useColor ? `${dim}${path}${reset}` : path;
      process.stdout.write(`${tick} Logged in  ${keyPart}  ${pathPart}\n`);
      return;
    }

    const cross = useColor ? `${red}✗${reset}` : '✗';
    const arrow = useColor ? `${dim}→${reset}` : '→';
    process.stdout.write(`${cross} Not logged in\n`);
    process.stdout.write(`${arrow} piapi auth login --api-key sk-…\n`);
  },
});
