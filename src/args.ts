import type { GlobalFlags, FlagOption } from './types/flags';
import { CLIError } from './errors/base';
import { ExitCode } from './errors/codes';
import { closest } from './suggest';

function kebabToCamel(s: string): string {
  return s.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
}

function flagName(opt: FlagOption): string | null {
  const m = opt.flag.match(/^--([a-z][a-z0-9-]*)/i);
  return m ? m[1]! : null;
}

function isBoolean(opt: FlagOption): boolean {
  if (opt.type === 'boolean') return true;
  if (opt.type === 'string' || opt.type === 'number' || opt.type === 'array') return false;
  return !opt.flag.includes('<') && !opt.flag.includes('[');
}

function buildSchema(opts: FlagOption[]) {
  const booleans = new Set<string>();
  const numbers = new Set<string>();
  const arrays = new Set<string>();
  const known = new Set<string>();   // camelCase keys of every declared flag
  const names: string[] = [];        // kebab-case names, for "did you mean"
  for (const o of opts) {
    const name = flagName(o);
    if (!name) continue;
    const k = kebabToCamel(name);
    known.add(k);
    names.push(name);
    if (isBoolean(o)) booleans.add(k);
    else if (o.type === 'number') numbers.add(k);
    else if (o.type === 'array') arrays.add(k);
  }
  return { booleans, numbers, arrays, known, names };
}

export function scanCommandPath(argv: string[], globalOptions: FlagOption[] = []): string[] {
  const schema = buildSchema(globalOptions);
  const path: string[] = [];
  let i = 0;
  while (i < argv.length) {
    const arg = argv[i]!;
    if (arg === '--') break;
    if (arg.startsWith('--')) {
      const eq = arg.indexOf('=');
      const key = eq !== -1 ? arg.slice(2, eq) : arg.slice(2);
      const ck = kebabToCamel(key);
      if (!schema.booleans.has(ck) && eq === -1) i += 2;
      else i++;
      continue;
    }
    if (arg.startsWith('-')) { i++; continue; }
    path.push(arg);
    i++;
  }
  return path;
}

export interface ParseFlagsOptions {
  // strict (default) rejects undeclared flags. The pre-resolution pass in
  // main.ts parses with strict=false because command-specific flags aren't
  // known until the command path is resolved.
  strict?: boolean;
}

export function parseFlags(
  argv: string[],
  options: FlagOption[],
  { strict = true }: ParseFlagsOptions = {},
): GlobalFlags {
  const schema = buildSchema(options);
  const flags: GlobalFlags = {};

  let i = 0;
  while (i < argv.length) {
    const arg = argv[i]!;
    if (arg === '--help' || arg === '-h') { flags.help = true; i++; continue; }
    if (arg === '--') break;

    if (arg.startsWith('--')) {
      const eq = arg.indexOf('=');
      let key: string;
      let value: string | undefined;

      if (eq !== -1) {
        key = arg.slice(2, eq);
        value = arg.slice(eq + 1);
      } else {
        key = arg.slice(2);
      }

      const ck = kebabToCamel(key);

      if (!schema.known.has(ck)) {
        if (strict) {
          const suggestion = closest(key, schema.names);
          throw new CLIError(
            `Unknown flag: --${key}`,
            ExitCode.USAGE,
            suggestion ? `Did you mean --${suggestion}? Run with --help to list flags.` : `Run with --help to list flags.`,
          );
        }
        // Lenient pass: skip the flag token without consuming a value — we
        // can't know its arity, and callers only read known global flags.
        i++;
        continue;
      }

      if (schema.booleans.has(ck)) {
        (flags as Record<string, unknown>)[ck] = true;
        i++;
        continue;
      }

      if (value === undefined) {
        i++;
        value = argv[i];
      }

      if (value === undefined) {
        throw new CLIError(`Flag --${key} requires a value.`, ExitCode.USAGE);
      }

      if (schema.arrays.has(ck)) {
        const arr = (flags as Record<string, unknown>)[ck] as string[] | undefined;
        if (arr) arr.push(value);
        else (flags as Record<string, unknown>)[ck] = [value];
      } else if (schema.numbers.has(ck)) {
        (flags as Record<string, unknown>)[ck] = Number(value);
      } else {
        (flags as Record<string, unknown>)[ck] = value;
      }
      i++;
      continue;
    }

    if (arg.startsWith('-')) {
      if (strict) {
        throw new CLIError(
          `Unknown flag: ${arg}`,
          ExitCode.USAGE,
          `Short flags are not supported (except -h/-v). Run with --help to list flags.`,
        );
      }
      i++;
      continue;
    }

    if (!flags._positional) flags._positional = [];
    flags._positional.push(arg);
    i++;
  }

  return flags;
}
