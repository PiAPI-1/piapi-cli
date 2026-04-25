import type { GlobalFlags } from '../types/flags';

export function getFormatter(flags: GlobalFlags): 'json' | 'text' {
  if (flags.output === 'json') return 'json';
  return 'text';
}
