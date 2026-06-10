import { describe, expect, test } from 'bun:test';
import { parseInput } from '../../src/models/input-parser';
import { CLIError } from '../../src/errors/base';

describe('parseInput', () => {
  test('key=value coerces booleans and numbers', () => {
    expect(parseInput(['prompt=a corgi', 'n=2', 'hd=true', 'draft=false'])).toEqual({
      prompt: 'a corgi',
      n: 2,
      hd: true,
      draft: false,
    });
  });

  test('@path values pass through untouched', () => {
    expect(parseInput(['image=@./dog.png'])).toEqual({ image: '@./dog.png' });
  });

  test('key==value forces a literal string', () => {
    expect(parseInput(['version==3.0', 'duration==5'])).toEqual({
      version: '3.0',
      duration: '5',
    });
  });

  test('key:=json parses strict JSON values', () => {
    expect(parseInput(['n:=2', 'flag:=false', 'urls:=["https://a.png","https://b.png"]', 'cfg:={"a":1}'])).toEqual({
      n: 2,
      flag: false,
      urls: ['https://a.png', 'https://b.png'],
      cfg: { a: 1 },
    });
  });

  test('key:=invalid-json throws a usage error', () => {
    try {
      parseInput(['urls:=[broken']);
      expect.unreachable();
    } catch (e) {
      expect(e).toBeInstanceOf(CLIError);
      expect((e as CLIError).message).toContain('Invalid JSON');
      expect((e as CLIError).hint).toContain('strict JSON');
    }
  });

  test('bare arguments throw instead of being silently dropped', () => {
    // Classic unquoted-prompt mistake: prompt=a corgi → shell splits "corgi".
    try {
      parseInput(['prompt=a', 'corgi']);
      expect.unreachable();
    } catch (e) {
      expect(e).toBeInstanceOf(CLIError);
      expect((e as CLIError).hint).toContain('quote');
    }
  });

  test('empty key throws', () => {
    expect(() => parseInput(['=value'])).toThrow(CLIError);
  });

  test('empty value stays an empty string', () => {
    expect(parseInput(['negative_prompt='])).toEqual({ negative_prompt: '' });
  });
});
