import { scanCommandPath, parseFlags } from './args';
import { GLOBAL_OPTIONS } from './command';
import { registry } from './registry';
import { handleError, setOutputMode } from './errors/handler';
import { resolveAPIKey } from './auth/resolver';
import { readConfigFile } from './config/loader';
import { CLIError } from './errors/base';

const VERSION = '0.1.0';

process.on('SIGINT', () => { process.stderr.write('\nInterrupted.\n'); process.exit(130); });
process.stdout.on('error', (e: NodeJS.ErrnoException) => { if (e.code === 'EPIPE') process.exit(0); throw e; });

import authLogin from './commands/auth/login';
import authStatus from './commands/auth/status';
import authLogout from './commands/auth/logout';
import configShow from './commands/config/show';
import configSet from './commands/config/set';
import quotaShow from './commands/quota/show';
import modelList from './commands/model/list';
import modelSchema from './commands/model/schema';
import taskList from './commands/task/list';
import taskGet from './commands/task/get';
import taskCancel from './commands/task/cancel';
import run from './commands/run';
import help from './commands/help';

registry.register('auth login', authLogin);
registry.register('auth status', authStatus);
registry.register('auth logout', authLogout);
registry.register('config show', configShow);
registry.register('config set', configSet);
registry.register('quota show', quotaShow);
registry.register('model list', modelList);
registry.register('model schema', modelSchema);
registry.register('task list', taskList);
registry.register('task get', taskGet);
registry.register('task cancel', taskCancel);
registry.register('run', run);
registry.register('help', help);

async function main() {
  const argv = process.argv.slice(2);

  if (argv.includes('--version') || argv.includes('-v')) {
    process.stdout.write(`piapi ${VERSION}\n`);
    process.exit(0);
  }

  const commandPath = scanCommandPath(argv, GLOBAL_OPTIONS);

  if (argv.includes('--help') || argv.includes('-h')) {
    registry.printHelp(commandPath);
    process.exit(0);
  }

  if (commandPath.length === 0) {
    registry.printHelp([]);
    process.exit(0);
  }

  // Pre-parse output mode for error handler setup
  const preFlags = parseFlags(argv, GLOBAL_OPTIONS);
  setOutputMode(preFlags.output ?? 'text');

  let command;
  let extra: string[] = [];
  try {
    ({ command, extra } = registry.resolve(commandPath));
  } catch (e) {
    if (e instanceof CLIError) {
      process.stderr.write(`${e.message}\n`);
      process.exit(e.code);
    }
    throw e;
  }

  const flags = parseFlags(argv, [...GLOBAL_OPTIONS, ...(command.options ?? [])]);

  // Strip command path elements from _positional since parseFlags captured them as unknown args
  const cmdLen = commandPath.length;
  const stripped = flags._positional?.slice(cmdLen) ?? [];
  flags._positional = extra.length > 0 ? [...extra, ...stripped] : stripped;

  const fileConfig = readConfigFile();
  const config = {
    ...fileConfig,
    apiKey: resolveAPIKey(flags.apiKey) ?? fileConfig.apiKey,
    baseUrl: flags.baseUrl ?? fileConfig.baseUrl ?? 'https://api.piapi.ai',
    quiet: flags.quiet,
    output: flags.output,
    nonInteractive: flags.nonInteractive,
    dryRun: flags.dryRun,
  };

  await command.execute(config, flags);
}

main().catch(handleError);
