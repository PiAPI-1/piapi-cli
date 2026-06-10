import type { FlagOption } from './types/flags';
import type { CommandSpec } from './types/commands';

export type { FlagOption };

export function defineCommand(spec: CommandSpec) {
  return spec;
}

export const GLOBAL_OPTIONS: FlagOption[] = [
  { flag: '--api-key <key>', description: 'API key (overrides env/config)', type: 'string' },
  { flag: '--base-url <url>', description: 'API base URL', type: 'string' },
  { flag: '--output <format>', description: 'Output format: json, text', type: 'string' },
  { flag: '--quiet', description: 'Suppress progress indicators' },
  { flag: '--no-color', description: 'Disable ANSI colors and spinner' },
  { flag: '--non-interactive', description: 'Fail when input is needed' },
  { flag: '--async', description: 'Return task ID without polling' },
  { flag: '--timeout <seconds>', description: 'Max wait while polling a task (default 300)', type: 'number' },
  { flag: '--stream', description: 'Stream LLM output as it arrives (LLM/openai-completions only)' },
  { flag: '--dry-run', description: 'Show request without executing' },
  { flag: '--webhook <url>', description: 'Webhook URL for callbacks', type: 'string' },
  { flag: '--out-dir <path>', description: 'Output directory for downloads', type: 'string' },
  { flag: '--download', description: 'Auto-download outputs' },
  { flag: '--version', description: 'Print version' },
  { flag: '--help', description: 'Show help' },
];
