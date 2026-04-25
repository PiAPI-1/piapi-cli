import { defineCommand } from '../../command';
import { writeConfigFile } from '../../config/loader';
import type { GlobalFlags } from '../../types/flags';
import { CLIError } from '../../errors/base';
import { ExitCode } from '../../errors/codes';

export default defineCommand({
  name: 'auth login',
  description: 'Save your PiAPI API key to ~/.piapi/config.json',
  usage: 'piapi auth login --api-key <key>',
  options: [
    { flag: '--api-key <key>', description: 'PiAPI API key (sk-...)', required: true },
  ],
  async execute(config, flags: GlobalFlags) {
    const apiKey = flags.apiKey ?? (flags._positional?.[0]);

    if (!apiKey) {
      if (flags.nonInteractive) throw new CLIError('--api-key is required in non-interactive mode', ExitCode.USAGE);
      const { text } = await import('@clack/prompts');
      const key = await text({ message: 'Enter your PiAPI API key:' });
      if (!key) throw new CLIError('No API key provided.', ExitCode.USAGE);
      flags.apiKey = key as string;
    }

    writeConfigFile({ ...config, apiKey: flags.apiKey ?? apiKey });
    process.stderr.write('API key saved to ~/.piapi/config.json\n');
  },
});
