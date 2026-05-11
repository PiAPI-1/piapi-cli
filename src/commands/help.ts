import { defineCommand } from '../command';
import { registry } from '../registry';
import { CLIError } from '../errors/base';
import { ExitCode } from '../errors/codes';
import type { GlobalFlags } from '../types/flags';
import { getFormatter } from '../output/formatter';
import { formatJSON } from '../output/json';

export default defineCommand({
  name: 'help',
  description: 'Show help',
  usage: 'piapi help [command]',
  async execute(_config, flags: GlobalFlags) {
    const cmdPath = (flags._positional ?? []) as string[];
    const formatter = getFormatter(flags);

    if (formatter !== 'json') {
      registry.printHelp(cmdPath);
      return;
    }

    if (cmdPath.length === 0) {
      process.stdout.write(formatJSON({ message: 'Run piapi help <command> for specific help' }) + '\n');
      return;
    }

    const desc = registry.describe(cmdPath);
    if (desc.kind === 'unknown') {
      throw new CLIError(`Unknown command: piapi ${cmdPath.join(' ')}`, ExitCode.USAGE);
    }
    if (desc.kind === 'command') {
      const cmd = desc.command;
      process.stdout.write(formatJSON({
        name: cmd.name,
        description: cmd.description,
        usage: cmd.usage,
        options: cmd.options,
        examples: cmd.examples,
      }) + '\n');
      return;
    }
    process.stdout.write(formatJSON({
      command: desc.path.join(' '),
      subcommands: desc.subcommands,
    }) + '\n');
  },
});
