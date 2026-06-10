import { describe, expect, test } from 'bun:test';
import { closest } from '../src/suggest';
import { MODELS } from '../src/models/catalog';

describe('closest', () => {
  const names = MODELS.map((m) => m.name);

  test('catches one-letter typos in model names', () => {
    expect(closest('flux-dv', names)).toBe('flux-dev');
    expect(closest('kling3', names)).toBe('kling-3');
  });

  test('returns undefined when nothing is plausibly a typo', () => {
    expect(closest('completely-unrelated-name', names)).toBeUndefined();
  });

  test('short inputs only match within distance 1', () => {
    expect(closest('x', ['ab', 'cd'])).toBeUndefined();
  });

  test('is case-insensitive', () => {
    expect(closest('FLUX-DEV', names)).toBe('flux-dev');
  });
});
