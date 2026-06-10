import { describe, expect, test } from 'bun:test';
import { parseFlags, scanCommandPath } from '../src/args';
import { GLOBAL_OPTIONS } from '../src/command';
import { CLIError } from '../src/errors/base';
import { ExitCode } from '../src/errors/codes';

describe('parseFlags strict mode', () => {
  test('rejects unknown long flags with a suggestion', () => {
    try {
      parseFlags(['run', 'flux-dev', '--quiete'], GLOBAL_OPTIONS);
      expect.unreachable();
    } catch (e) {
      expect(e).toBeInstanceOf(CLIError);
      expect((e as CLIError).code).toBe(ExitCode.USAGE);
      expect((e as CLIError).message).toContain('--quiete');
      expect((e as CLIError).hint).toContain('--quiet');
    }
  });

  test('unknown flag no longer swallows the next argument', () => {
    // Previously --asycn was treated as a value flag and ate prompt="x".
    expect(() => parseFlags(['run', 'flux-dev', '--asycn', 'prompt=x'], GLOBAL_OPTIONS))
      .toThrow(/--asycn/);
  });

  test('rejects unknown short flags', () => {
    expect(() => parseFlags(['run', '-q'], GLOBAL_OPTIONS)).toThrow(/-q/);
  });

  test('lenient mode ignores unknown flags (preflight pass)', () => {
    // --type is a command-specific flag, unknown at preflight time. The
    // lenient pass must neither throw nor crash, even when the unknown flag
    // is the trailing token.
    expect(() => parseFlags(['model', 'list', '--type', 'image'], GLOBAL_OPTIONS, { strict: false })).not.toThrow();
    expect(() => parseFlags(['run', 'x', '--asycn'], GLOBAL_OPTIONS, { strict: false })).not.toThrow();
  });

  test('known flags still parse: booleans, values, numbers', () => {
    const flags = parseFlags(
      ['run', 'flux-dev', 'prompt=x', '--download', '--out-dir', './o', '--timeout', '600'],
      GLOBAL_OPTIONS,
    );
    expect(flags.download).toBe(true);
    expect(flags.outDir).toBe('./o');
    expect(flags.timeout).toBe(600);
    expect(flags._positional).toEqual(['run', 'flux-dev', 'prompt=x']);
  });

  test('-h and --help are always accepted', () => {
    expect(parseFlags(['-h'], GLOBAL_OPTIONS).help).toBe(true);
    expect(parseFlags(['--help'], GLOBAL_OPTIONS).help).toBe(true);
  });

  test('args after -- are not parsed as flags', () => {
    expect(() => parseFlags(['run', '--', '--not-a-flag'], GLOBAL_OPTIONS)).not.toThrow();
  });
});

describe('scanCommandPath', () => {
  test('skips flag values when collecting the command path', () => {
    expect(scanCommandPath(['--output', 'json', 'task', 'get', 'abc'], GLOBAL_OPTIONS))
      .toEqual(['task', 'get', 'abc']);
  });

  test('boolean flags do not consume the next token', () => {
    expect(scanCommandPath(['--quiet', 'run', 'flux-dev'], GLOBAL_OPTIONS))
      .toEqual(['run', 'flux-dev']);
  });
});
