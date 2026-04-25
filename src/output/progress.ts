import { isCancel } from '@clack/prompts';
import type { GlobalFlags } from '../types/flags';

export class Progress {
  private quiet: boolean;

  constructor(_message: string, flags: GlobalFlags = {}) {
    this.quiet = flags.quiet ?? false;
  }

  stop(msg?: string): void {
    if (this.quiet) return;
    if (msg) process.stderr.write(`\n${msg}\n`);
  }

  static spin(message: string, flags: GlobalFlags = {}): { stop: (msg?: string) => void } {
    if (flags.quiet) return { stop: () => {} };
    process.stderr.write(`\n${message}...\n`);
    return { stop: (msg?: string) => {
      if (msg) process.stderr.write(`\n${msg}\n`);
    }};
  }
}

export function handleCancel<T>(value: T | symbol): T | never {
  if (isCancel(value)) { process.exit(0); }
  return value as T;
}
