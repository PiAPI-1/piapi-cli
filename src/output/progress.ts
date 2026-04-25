import { colorEnabled } from './color';

const SPINNER_FRAMES = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];

function ttyEnabled(): boolean {
  return colorEnabled(process.stderr);
}

export interface Spinner {
  start(): void;
  update(text: string): void;
  stop(finalText?: string): void;
}

// Track every running spinner so SIGINT can clear the line before the
// process exits, preventing a half-rendered braille frame from being
// left in the terminal.
const active = new Set<Spinner>();

export function stopAllSpinners(): void {
  for (const s of active) s.stop();
  active.clear();
}

export function createSpinner(label: string): Spinner {
  const enabled = ttyEnabled();
  let frame = 0;
  let interval: ReturnType<typeof setInterval> | null = null;
  let currentLabel = label;

  const self: Spinner = {
    start() {
      if (!enabled || interval) return;
      active.add(self);
      interval = setInterval(() => {
        process.stderr.write(`\r${SPINNER_FRAMES[frame % SPINNER_FRAMES.length]} ${currentLabel}`);
        frame++;
      }, 80);
    },
    update(text: string) {
      currentLabel = text;
    },
    stop(finalText?: string) {
      if (interval) {
        clearInterval(interval);
        interval = null;
      }
      active.delete(self);
      if (enabled) {
        process.stderr.write('\r\x1b[K');
      }
      if (finalText) process.stderr.write(`${finalText}\n`);
    },
  };
  return self;
}

export interface ProgressBar {
  update(current: number): void;
  finish(): void;
}

export function createProgressBar(total: number, label = ''): ProgressBar {
  const enabled = ttyEnabled();
  const width = 30;

  return {
    update(current: number) {
      if (!enabled) return;
      const pct = Math.min(1, Math.max(0, current / total));
      const filled = Math.round(width * pct);
      const empty = width - filled;
      const bar = '█'.repeat(filled) + '░'.repeat(empty);
      process.stderr.write(`\r${label} ${bar} ${Math.round(pct * 100)}%`);
    },
    finish() {
      if (enabled) process.stderr.write('\n');
    },
  };
}

// Run async work with a spinner. Auto-stops on success/error; respects quiet.
export async function withSpinner<T>(
  label: string,
  opts: { quiet?: boolean },
  fn: (spinner: Spinner) => Promise<T>,
): Promise<T> {
  const spinner = createSpinner(label);
  if (!opts.quiet) spinner.start();
  try {
    return await fn(spinner);
  } finally {
    spinner.stop();
  }
}
