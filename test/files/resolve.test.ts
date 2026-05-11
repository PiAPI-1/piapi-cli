import { describe, expect, test } from 'bun:test';
import { mkdtempSync, writeFileSync, symlinkSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { resolveLocalFiles } from '../../src/files/resolve';

const fakeUploader = async (path: string) => ({ url: `https://fake/${path}`, filename: path });

describe('resolveLocalFiles', () => {
  test('uploads regular files and rewrites the input', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'piapi-resolve-'));
    const file = join(dir, 'real.txt');
    writeFileSync(file, 'hello');

    const { input, uploads } = await resolveLocalFiles(
      { image_url: `@${file}`, prompt: 'untouched' },
      fakeUploader,
    );
    expect(input.image_url).toBe(`https://fake/${file}`);
    expect(input.prompt).toBe('untouched');
    expect(uploads.length).toBe(1);

    rmSync(dir, { recursive: true });
  });

  test('rejects symlinks to prevent path-traversal smuggling', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'piapi-resolve-'));
    const target = join(dir, 'real.txt');
    const link = join(dir, 'link.txt');
    writeFileSync(target, 'hello');
    symlinkSync(target, link);

    await expect(
      resolveLocalFiles({ image_url: `@${link}` }, fakeUploader),
    ).rejects.toThrow(/symlink/i);

    rmSync(dir, { recursive: true });
  });

  test('rejects device files like /dev/null', async () => {
    await expect(
      resolveLocalFiles({ image_url: '@/dev/null' }, fakeUploader),
    ).rejects.toThrow(/regular file/i);
  });

  test('rejects directories', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'piapi-resolve-'));
    await expect(
      resolveLocalFiles({ image_url: `@${dir}` }, fakeUploader),
    ).rejects.toThrow(/regular file/i);
    rmSync(dir, { recursive: true });
  });

  test('passes non-@ strings through untouched', async () => {
    const { input, uploads } = await resolveLocalFiles(
      { image_url: 'https://example.com/img.png', prompt: 'hi' },
      fakeUploader,
    );
    expect(input.image_url).toBe('https://example.com/img.png');
    expect(uploads.length).toBe(0);
  });

  test('throws CLIError with helpful hint when @path does not exist', async () => {
    await expect(
      resolveLocalFiles({ image_url: '@/definitely/nonexistent/path.png' }, fakeUploader),
    ).rejects.toThrow(/Local file not found/);
  });
});
