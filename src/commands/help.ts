import { defineCommand } from '../command';
import { registry } from '../registry';
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

    if (formatter === 'json') {
      if (cmdPath.length === 0) {
        // Root help: list all top-level commands
        process.stdout.write(formatJSON({ message: 'Run piapi help <command> for specific help' }) + '\n');
      } else {
        const { command } = registry.resolve(cmdPath);
        process.stdout.write(formatJSON({
          name: command.name,
          description: command.description,
          usage: command.usage,
          options: command.options,
        }) + '\n');
      }
    } else {
      registry.printHelp(cmdPath);
    }
  },
});
