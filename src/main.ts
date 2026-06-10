import { scanCommandPath, parseFlags } from './args';
import { GLOBAL_OPTIONS } from './command';
import { registry } from './registry';
import { handleError, setOutputMode } from './errors/handler';
import { resolveAPIKey } from './auth/resolver';
import { readConfigFile } from './config/loader';
import { maybeShowStatusBar } from './output/status-bar';
import { setNoColor } from './output/color';
import { stopAllSpinners } from './output/progress';
import { maybeNotifyUpdate } from './update-check';

// Injected at build time from package.json via Bun's `define`. The fallback
// only fires under `bun run dev` (source mode), where the build step hasn't run.
const VERSION = process.env.CLI_VERSION ?? '0.0.0-dev';

process.on('SIGINT', () => {
  stopAllSpinners();
  process.stderr.write('\nInterrupted.\n');
  process.exit(130);
});
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

  // Resolve global flags before any rendering so --no-color and --output
  // affect even the early help/version path. Lenient: command-specific flags
  // aren't known yet — the post-resolution parse below is the strict one.
  const preFlags = parseFlags(argv, GLOBAL_OPTIONS, { strict: false });
  setOutputMode(preFlags.output ?? 'text');
  setNoColor(preFlags.noColor === true);

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

  const { command, extra } = registry.resolve(commandPath);

  const flags = parseFlags(argv, [...GLOBAL_OPTIONS, ...(command.options ?? [])]);

  // Strip command path elements from _positional since parseFlags captured them as unknown args
  const cmdLen = commandPath.length;
  const stripped = flags._positional?.slice(cmdLen) ?? [];
  flags._positional = extra.length > 0 ? [...extra, ...stripped] : stripped;

  const fileConfig = readConfigFile();
  const apiKey = resolveAPIKey(flags.apiKey) ?? fileConfig.apiKey;
  const keySource: 'flag' | 'env' | 'file' | 'none' =
    flags.apiKey ? 'flag' :
    process.env.PIAPI_API_KEY ? 'env' :
    fileConfig.apiKey ? 'file' : 'none';
  const baseUrl = flags.baseUrl ?? fileConfig.baseUrl ?? 'https://api.piapi.ai';
  const config = {
    ...fileConfig,
    apiKey,
    baseUrl,
    quiet: flags.quiet,
    output: flags.output,
    nonInteractive: flags.nonInteractive,
    dryRun: flags.dryRun,
  };

  // Brand banner — skipped in JSON mode, dry-run, auth flows, and `config` ops
  // (which print the same info themselves), or whenever stderr isn't a TTY.
  const skipBanner =
    flags.output === 'json' ||
    flags.dryRun ||
    commandPath[0] === 'help' ||
    commandPath[0] === 'auth' ||
    commandPath[0] === 'config';
  if (!skipBanner) {
    const model = commandPath[0] === 'run' ? flags._positional?.[0] : undefined;
    maybeShowStatusBar({ apiKey, keySource, baseUrl, quiet: flags.quiet, model });
  }

  await command.execute(config, flags);

  // Print update hint last so it never interleaves with command output. Skip
  // for JSON consumers and quiet runs; the function also self-skips on dev
  // builds and non-TTY stderr.
  if (flags.output !== 'json' && !flags.quiet) maybeNotifyUpdate(VERSION);
}

main().catch(handleError);
