import type { GlobalFlags } from '../types/flags';
import { formatText } from './text';
import { formatJSON } from './json';

export type OutputFormat = 'text' | 'json';

export function detectOutputFormat(flagValue?: string): OutputFormat {
  if (flagValue === 'json' || flagValue === 'text') return flagValue;
  // Pipe-friendly default: when stdout is not a TTY (piped to jq, file, etc.),
  // emit JSON so structured consumers don't have to parse the human format.
  if (!process.stdout.isTTY) return 'json';
  return 'text';
}

export function getFormatter(flags: GlobalFlags): OutputFormat {
  return detectOutputFormat(flags.output);
}

export function formatOutput(data: unknown, format: OutputFormat): string {
  return format === 'json' ? formatJSON(data) : formatText(data);
}
