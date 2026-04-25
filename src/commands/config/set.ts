import { defineCommand } from '../../command';
import { readConfigFile, writeConfigFile } from '../../config/loader';
import type { GlobalFlags } from '../../types/flags';
import { CLIError } from '../../errors/base';
import { ExitCode } from '../../errors/codes';

export default defineCommand({
  name: 'config set',
  description: 'Set a configuration value',
  usage: 'piapi config set --key <key> --value <value>',
  options: [
    { flag: '--key <key>', description: 'Config key', required: true },
    { flag: '--value <value>', description: 'Config value', required: true },
  ],
  async execute(_config, flags: GlobalFlags) {
    const key = flags.key;
    const value = flags.value;

    if (!key || value === undefined) {
      throw new CLIError('Usage: piapi config set --key <key> --value <value>', ExitCode.USAGE);
    }

    const cfg = readConfigFile();
    if (key === 'apiKey' || key === 'api_key') cfg.apiKey = value;
    else if (key === 'baseUrl' || key === 'base_url') cfg.baseUrl = value;
    else throw new CLIError(`Unknown config key: ${key}`, ExitCode.USAGE);

    writeConfigFile(cfg);
    process.stderr.write(`${key} set to ${value}\n`);
  },
});
