import { CLIError } from '../errors/base';
import { ExitCode } from '../errors/codes';

export interface ParsedInput {
  [key: string]: unknown;
}

// Three operators, modeled on httpie:
//   key=value    convenience form — coerces "true"/"false"/numerics, keeps
//                everything else as a string. `@path` passes through for the
//                upload resolver.
//   key==value   literal string, never coerced (version==3.0 → "3.0")
//   key:=json    strict JSON — numbers, bools, arrays, objects
//                (image_urls:='["https://a.png"]')
export function parseInput(args: string[]): ParsedInput {
  const result: ParsedInput = {};

  for (const arg of args) {
    const eq = arg.indexOf('=');
    if (eq <= 0) {
      throw new CLIError(
        `Invalid argument: "${arg}" — expected key=value.`,
        ExitCode.USAGE,
        arg.includes('=')
          ? `The key part before "=" is empty.`
          : `If your value contains spaces, quote the whole pair: prompt="a corgi in the snow".`,
      );
    }

    let key = arg.slice(0, eq);
    const raw = arg.slice(eq + 1);

    // key:=json — strict typed input.
    if (key.endsWith(':')) {
      key = key.slice(0, -1);
      try {
        result[key] = JSON.parse(raw);
      } catch {
        throw new CLIError(
          `Invalid JSON for ${key}:= — got: ${raw}`,
          ExitCode.USAGE,
          `The := operator takes strict JSON, e.g. n:=2, urls:='["https://a.png"]'. For a plain string use ${key}==…`,
        );
      }
      continue;
    }

    // key==value — literal string, no coercion.
    if (raw.startsWith('=')) {
      result[key] = raw.slice(1);
      continue;
    }

    // key=value — heuristic coercion for convenience.
    let value: unknown = raw;
    if (raw === 'true') value = true;
    else if (raw === 'false') value = false;
    else if (!isNaN(Number(raw)) && raw !== '') value = Number(raw);
    result[key] = value;
  }

  return result;
}

export function isLocalPath(value: unknown): boolean {
  return typeof value === 'string' && value.startsWith('@');
}
