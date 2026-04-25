import { defineCommand } from '../../command';
import { isLoggedIn } from '../../auth/status';
import type { GlobalFlags } from '../../types/flags';
import { getFormatter } from '../../output/formatter';
import { formatJSON } from '../../output/json';

export default defineCommand({
  name: 'auth status',
  description: 'Check if you are logged in',
  async execute(config, flags: GlobalFlags) {
    const loggedIn = isLoggedIn();
    const formatter = getFormatter(flags);

    if (formatter === 'json') {
      process.stdout.write(formatJSON({ logged_in: loggedIn, api_key_set: !!config.apiKey }) + '\n');
    } else {
      if (loggedIn) {
        process.stdout.write(`Logged in${config.apiKey ? ` (key: ${config.apiKey.slice(0, 8)}...)` : ''}\n`);
      } else {
        process.stdout.write('Not logged in. Run: piapi auth login --api-key sk-...\n');
      }
    }
  },
});
