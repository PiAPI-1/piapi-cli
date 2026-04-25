// Single source of truth for "should I emit ANSI escape codes?"
// Resolution order: --no-color flag > NO_COLOR env > stream.isTTY

let forceNoColor = false;

export function setNoColor(value: boolean): void {
  forceNoColor = value;
}

export function colorEnabled(stream: NodeJS.WriteStream = process.stdout): boolean {
  if (forceNoColor) return false;
  if (process.env.NO_COLOR) return false;
  return stream.isTTY === true;
}

// ── ANSI palette (PiAPI brand) ──
// Strict rule: blue is the only accent. No cyan/teal, no purple/pink — those
// trigger generic "AI tool" associations we want to avoid. Usage-state
// fg/bg (green/yellow/red) are functional, not brand.
export const ANSI = {
  reset:    '\x1b[0m',
  bold:     '\x1b[1m',
  dim:      '\x1b[2m',
  // Brand
  blue:     '\x1b[38;2;30;110;220m',
  // Usage states
  green:    '\x1b[38;2;74;222;128m',
  yellow:   '\x1b[38;2;250;204;21m',
  red:      '\x1b[38;2;248;113;113m',
  bgGreen:  '\x1b[48;2;22;163;74m',
  bgYellow: '\x1b[48;2;202;138;4m',
  bgRed:    '\x1b[48;2;220;38;38m',
  bgEmpty:  '\x1b[48;2;55;65;81m',
} as const;

// Convenience wrap helpers — no-op when color disabled for the given stream.
export function bold(s: string, stream?: NodeJS.WriteStream): string {
  return colorEnabled(stream) ? `${ANSI.bold}${s}${ANSI.reset}` : s;
}

export function dim(s: string, stream?: NodeJS.WriteStream): string {
  return colorEnabled(stream) ? `${ANSI.dim}${s}${ANSI.reset}` : s;
}
