import { ANSI, colorEnabled } from './color';

export function formatElapsed(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`;
  const m = Math.floor(ms / 60_000);
  const s = Math.round((ms % 60_000) / 1000);
  return `${m}m ${s}s`;
}

interface SuccessOpts {
  title: string;
  elapsedMs?: number;
  extra?: string;
}

// `✓ flux-dev  •  3.2s  •  10 credits` — primary completion line on stdout.
export function printRunSuccess(opts: SuccessOpts): void {
  const useColor = colorEnabled(process.stdout);
  const tick = useColor ? `${ANSI.green}✓${ANSI.reset}` : '✓';
  const parts = [opts.title];
  if (opts.elapsedMs !== undefined) parts.push(formatElapsed(opts.elapsedMs));
  if (opts.extra) parts.push(opts.extra);

  if (!useColor) {
    process.stdout.write(`${tick} ${parts.join('  •  ')}\n`);
    return;
  }
  const sep = ` ${ANSI.dim}•${ANSI.reset} `;
  const [head, ...rest] = parts;
  const tail = rest.length > 0 ? sep + rest.map(p => `${ANSI.dim}${p}${ANSI.reset}`).join(sep) : '';
  process.stdout.write(`${tick} ${head}${tail}\n`);
}

interface PendingOpts {
  title: string;
  taskId: string;
  status: string;
  hint?: string;
}

// `○ flux-dev  •  pending  •  Task abc123` for async-only / --async flow.
export function printRunPending(opts: PendingOpts): void {
  const useColor = colorEnabled(process.stdout);
  const dot = useColor ? `${ANSI.dim}○${ANSI.reset}` : '○';
  const arrow = useColor ? `${ANSI.dim}→${ANSI.reset}` : '→';

  if (!useColor) {
    process.stdout.write(`${dot} ${opts.title}  •  ${opts.status}  •  Task ${opts.taskId}\n`);
    if (opts.hint) process.stdout.write(`${arrow} ${opts.hint}\n`);
    return;
  }
  const sep = ` ${ANSI.dim}•${ANSI.reset} `;
  process.stdout.write(
    `${dot} ${opts.title}${sep}${ANSI.dim}${opts.status}${ANSI.reset}${sep}${ANSI.dim}Task ${opts.taskId}${ANSI.reset}\n`,
  );
  if (opts.hint) process.stdout.write(`${arrow} ${opts.hint}\n`);
}
