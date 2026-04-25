import { createSpinner } from '../output/progress';
import { CLIError } from '../errors/base';
import { ExitCode } from '../errors/codes';

export interface PollOptions<T> {
  quiet?: boolean;
  timeout?: number;
  label?: string;
  getStatus?: (value: T) => string;
}

export async function pollTask<T>(
  fn: () => Promise<T>,
  isDone: (v: T) => boolean,
  opts: PollOptions<T> = {},
): Promise<T> {
  const { quiet = false, timeout = 300_000, label = 'Polling…', getStatus } = opts;
  const start = Date.now();
  let delay = 1000;
  const maxDelay = 30_000;

  const spinner = createSpinner(label);
  if (!quiet) spinner.start();

  try {
    while (true) {
      if (Date.now() - start > timeout) {
        throw new CLIError(
          'Task polling timed out.',
          ExitCode.TIMEOUT,
          'Increase --timeout, or check task status with `piapi task get <id>`.',
        );
      }

      const value = await fn();
      if (isDone(value)) return value;

      const elapsed = Math.round((Date.now() - start) / 1000);
      const statusStr = getStatus?.(value);
      spinner.update(statusStr ? `${label} ${statusStr} (${elapsed}s)` : `${label} (${elapsed}s)`);

      await sleep(delay);
      delay = Math.min(delay * 1.5, maxDelay);
    }
  } finally {
    spinner.stop();
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms));
}
