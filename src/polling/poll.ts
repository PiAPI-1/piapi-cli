import { createSpinner } from '../output/progress';
import { CLIError } from '../errors/base';
import { APIError } from '../errors/api';
import { ExitCode } from '../errors/codes';

export interface PollOptions<T> {
  quiet?: boolean;
  timeout?: number;
  label?: string;
  getStatus?: (value: T) => string;
  // Full command the user can run to resume waiting (e.g. `piapi task wait abc`).
  // Substituted into the timeout error hint so the real task id is never lost.
  resumeCommand?: string;
}

// A poll request that dies on a transient error (network blip, 5xx, gateway
// timeout) shouldn't abort a multi-minute wait — the task is still running
// server-side. Client errors (4xx) won't heal on retry, so they propagate.
function isTransient(e: unknown): boolean {
  if (e instanceof APIError) return e.statusCode === 0 || e.statusCode >= 500;
  if (e instanceof CLIError) return false;
  return e instanceof Error; // fetch/network failures
}

const MAX_CONSECUTIVE_FAILURES = 3;

export async function pollTask<T>(
  fn: () => Promise<T>,
  isDone: (v: T) => boolean,
  opts: PollOptions<T> = {},
): Promise<T> {
  const { quiet = false, timeout = 300_000, label = 'Polling…', getStatus } = opts;
  const start = Date.now();
  let delay = 1000;
  const maxDelay = 30_000;
  let failures = 0;

  const spinner = createSpinner(label);
  if (!quiet) spinner.start();

  try {
    while (true) {
      if (Date.now() - start > timeout) {
        throw new CLIError(
          'Task polling timed out.',
          ExitCode.TIMEOUT,
          opts.resumeCommand
            ? `The task may still be running. Increase --timeout, or resume with: ${opts.resumeCommand}`
            : 'The task may still be running. Increase --timeout to wait longer.',
        );
      }

      const elapsed = () => Math.round((Date.now() - start) / 1000);
      try {
        const value = await fn();
        failures = 0;
        if (isDone(value)) return value;
        const statusStr = getStatus?.(value);
        spinner.update(statusStr ? `${label} ${statusStr} (${elapsed()}s)` : `${label} (${elapsed()}s)`);
      } catch (e) {
        if (!isTransient(e) || ++failures >= MAX_CONSECUTIVE_FAILURES) throw e;
        spinner.update(`${label} (retrying after error, ${elapsed()}s)`);
      }

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
