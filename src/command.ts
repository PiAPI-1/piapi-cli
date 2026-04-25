import type { FlagOption } from './types/flags';
import type { CommandSpec } from './types/commands';

export type { FlagOption };

export function defineCommand(spec: CommandSpec) {
  return spec;
}

export const GLOBAL_OPTIONS: FlagOption[] = [
  { flag: '--api-key <key>', description: 'API key', type: 'string' },
  { flag: '--base-url <url>', description: 'API base URL', type: 'string' },
  { flag: '--output <format>', description: 'Output format: json, text', type: 'string' },
  { flag: '--quiet', description: 'Suppress progress indicators' },
  { flag: '--non-interactive', description: 'Fail when interactive input is needed' },
  { flag: '--async', description: 'Return task ID immediately without polling' },
  { flag: '--dry-run', description: 'Print request without executing' },
  { flag: '--webhook <url>', description: 'Webhook URL for callbacks', type: 'string' },
  { flag: '--out-dir <path>', description: 'Output directory for downloads', type: 'string' },
  { flag: '--download', description: 'Auto-download outputs when ready' },
  { flag: '--help', description: 'Show help' },
  { flag: '--version', description: 'Print version' },
];
