import { CLIError } from './base';
import { ExitCode } from './codes';

let outputMode: 'json' | 'text' = 'text';

export function setOutputMode(mode: 'json' | 'text'): void {
  outputMode = mode;
}

export function handleError(e: unknown): void {
  if (e instanceof CLIError) {
    if (outputMode === 'json') {
      process.stderr.write(JSON.stringify({ error: e.message, hint: e.hint ?? null, code: e.code }) + '\n');
    } else {
      if (e.message) process.stderr.write(`${e.message}\n`);
      if (e.hint) process.stderr.write(`Hint: ${e.hint}\n`);
    }
    process.exit(e.code);
  }

  if (e instanceof Error) {
    if (outputMode === 'json') {
      process.stderr.write(JSON.stringify({ error: e.message, code: ExitCode.INTERNAL }) + '\n');
    } else {
      process.stderr.write(`Error: ${e.message}\n`);
    }
    process.exit(ExitCode.INTERNAL);
  }

  const msg = String(e);
  if (outputMode === 'json') {
    process.stderr.write(JSON.stringify({ error: msg, code: ExitCode.INTERNAL }) + '\n');
  } else {
    process.stderr.write(`Unknown error: ${msg}\n`);
  }
  process.exit(ExitCode.INTERNAL);
}
