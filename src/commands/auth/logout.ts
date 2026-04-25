import { defineCommand } from '../../command';
import { writeConfigFile } from '../../config/loader';
import type { GlobalFlags } from '../../types/flags';

export default defineCommand({
  name: 'auth logout',
  description: 'Remove your API key from ~/.piapi/config.json',
  async execute(_config, _flags: GlobalFlags) {
    writeConfigFile({});
    process.stderr.write('Logged out. ~/.piapi/config.json cleared.\n');
  },
});
