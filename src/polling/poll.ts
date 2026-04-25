
export interface PollOptions {
  quiet?: boolean;
  timeout?: number;
  onProgress?: (status: string) => void;
}

export async function pollTask<T>(
  fn: () => Promise<T>,
  isDone: (v: T) => boolean,
  opts: PollOptions = {},
): Promise<T> {
  const { quiet = false, timeout = 300_000, onProgress } = opts;
  const start = Date.now();
  let delay = 1000;
  const maxDelay = 30_000;

  while (true) {
    if (Date.now() - start > timeout) throw new Error('Task polling timed out');
    const value = await fn();
    if (isDone(value)) return value;
    if (!quiet) process.stderr.write('.');
    onProgress?.('polling');
    await sleep(delay);
    delay = Math.min(delay * 1.5, maxDelay);
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms));
}
