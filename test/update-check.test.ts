import { describe, expect, test } from 'bun:test';
import { isNewer } from '../src/update-check';

describe('isNewer', () => {
  test('strictly greater patch', () => {
    expect(isNewer('0.1.5', '0.1.0')).toBe(true);
    expect(isNewer('0.1.0', '0.1.5')).toBe(false);
  });

  test('greater minor outranks patch', () => {
    expect(isNewer('0.2.0', '0.1.99')).toBe(true);
  });

  test('greater major outranks minor', () => {
    expect(isNewer('1.0.0', '0.99.99')).toBe(true);
  });

  test('equal versions are not newer', () => {
    expect(isNewer('1.2.3', '1.2.3')).toBe(false);
  });

  test('mismatched part counts pad with zero', () => {
    expect(isNewer('1.2', '1.2.0')).toBe(false);
    expect(isNewer('1.2.1', '1.2')).toBe(true);
  });

  test('stable release is newer than a pre-release with same base', () => {
    expect(isNewer('0.1.0', '0.1.0-dev')).toBe(true);
    expect(isNewer('0.1.0-dev', '0.1.0')).toBe(false);
  });

  test('malformed versions resolve to false rather than throw', () => {
    expect(isNewer('not.a.version', '1.0.0')).toBe(false);
    expect(isNewer('1.0.0', 'garbage')).toBe(false);
  });
});
