export interface ParsedInput {
  [key: string]: unknown;
}

export function parseInput(args: string[]): ParsedInput {
  const result: ParsedInput = {};

  for (const arg of args) {
    const eq = arg.indexOf('=');
    if (eq === -1) continue;

    const key = arg.slice(0, eq);
    let value: unknown = arg.slice(eq + 1);

    // @file references are kept as strings for now (uploaded later)
    if (typeof value === 'string') {
      if (value === 'true') value = true;
      else if (value === 'false') value = false;
      else if (!isNaN(Number(value)) && value !== '') value = Number(value);
    }

    result[key] = value;
  }

  return result;
}

export function isLocalPath(value: unknown): boolean {
  return typeof value === 'string' && value.startsWith('@');
}
