import { defineCommand } from '../../command';
import { readConfigFile, writeConfigFile } from '../../config/loader';
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
  async execute(_config, flags: GlobalFlags) {
    let apiKey = (flags.apiKey ?? flags._positional?.[0])?.trim();

    if (!apiKey) {
      if (flags.nonInteractive || !process.stdin.isTTY) {
        throw new CLIError('--api-key is required in non-interactive mode', ExitCode.USAGE);
      }
      const { password, isCancel } = await import('@clack/prompts');
      const key = await password({ message: 'Enter your PiAPI API key:' });
      if (isCancel(key) || typeof key !== 'string' || !key.trim()) {
        throw new CLIError('Login cancelled — no API key provided.', ExitCode.USAGE);
      }
      apiKey = key.trim();
    }

    // Persist only durable config: the key, plus base-url when explicitly
    // overridden. The resolved runtime config (defaults, --quiet, --output…)
    // must never leak into the file — writing the default baseUrl would pin
    // users to it if the CLI's default ever changes.
    const existing = readConfigFile();
    writeConfigFile({
      ...existing,
      apiKey,
      ...(flags.baseUrl ? { baseUrl: flags.baseUrl } : {}),
    });
    process.stderr.write('API key saved to ~/.piapi/config.json\n');
  },
});
