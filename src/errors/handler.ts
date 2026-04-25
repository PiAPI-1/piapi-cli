import { CLIError } from './base';
import { ExitCode } from './codes';
import { formatErrorJSON } from '../output/json';
import { ANSI, colorEnabled } from '../output/color';

let outputMode: 'json' | 'text' = 'text';

export function setOutputMode(mode: 'json' | 'text'): void {
  outputMode = mode;
}

function emit(code: number, message: string, hint?: string): void {
  if (outputMode === 'json') {
    process.stderr.write(formatErrorJSON(code, message, hint) + '\n');
    return;
  }
  const useColor = colorEnabled(process.stderr);
  const cross = useColor ? `${ANSI.red}✗${ANSI.reset}` : '✗';
  const arrow = useColor ? `${ANSI.dim}→${ANSI.reset}` : '→';
  if (message) process.stderr.write(`${cross} ${message}\n`);
  if (hint)    process.stderr.write(`${arrow} ${hint}\n`);
}

export function handleError(e: unknown): void {
  if (e instanceof CLIError) {
    emit(e.code, e.message, e.hint);
    process.exit(e.code);
  }

  if (e instanceof Error) {
    emit(ExitCode.INTERNAL, e.message);
    process.exit(ExitCode.INTERNAL);
  }

  emit(ExitCode.INTERNAL, `Unknown error: ${String(e)}`);
  process.exit(ExitCode.INTERNAL);
}
