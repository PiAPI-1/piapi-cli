import { afterAll, describe, expect, test } from 'bun:test';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const home = mkdtempSync(join(tmpdir(), 'piapi-image-preview-'));
const main = fileURLToPath(new URL('../../src/main.ts', import.meta.url));
afterAll(() => rmSync(home, { recursive: true, force: true }));
function preview(args: string[]) {
  const result = Bun.spawnSync({
    cmd: [process.execPath, main, 'run', ...args, '--dry-run', '--quiet', '--non-interactive', '--output', 'json', '--base-url', 'http://127.0.0.1:1'],
    env: { ...process.env, HOME: home, PIAPI_API_KEY: '', PIAPI_NO_UPDATE_CHECK: '1' },
    timeout: 5000,
  });
  return { code: result.exitCode, stdout: result.stdout.toString(), stderr: result.stderr.toString() };
}

describe('image edit and async CLI previews', () => {
  test('preserves default synchronous generation', () => {
    const res = preview(['gpt-image-2-ga', 'prompt=fixture']);
    expect(res.code).toBe(0);
    expect(res.stderr).toContain('/v1/images/generations\n');
    expect(JSON.parse(res.stderr.split('[DRY RUN] Body: ')[1]!)).toEqual({ model: 'gpt-image-2', quality: 'medium', prompt: 'fixture' });
  });
  test('async generation selects the task gateway with no unified envelope', () => {
    const res = preview(['gpt-image-2-ga', 'prompt=fixture', '--async']);
    expect(res.code).toBe(0);
    expect(res.stderr).toContain('/api/v1/images/generations/async\n');
    expect(JSON.parse(res.stderr.split('[DRY RUN] Body: ')[1]!)).toEqual({ model: 'gpt-image-2', quality: 'medium', prompt: 'fixture' });
  });
  test.each([false, true])('edit multipart preview, async=%s, never opens files', asyncMode => {
    const res = preview(['gpt-image-2-ga', 'prompt=fixture', 'image:=["@/missing/a.png","@/missing/b.webp"]', 'mask=@/missing/mask.png', '--edit', ...(asyncMode ? ['--async'] : [])]);
    expect(res.code).toBe(0);
    expect(res.stdout).toBe('');
    expect(res.stderr).toContain(asyncMode ? '/api/v1/images/edits/async\n' : '/v1/images/edits\n');
    expect(res.stderr).toContain('multipart/form-data');
    const body = JSON.parse(res.stderr.split('[DRY RUN] Body: ')[1]!);
    expect(body.image).toEqual(['@/missing/a.png', '@/missing/b.webp']);
    expect(body.mask).toBe('@/missing/mask.png');
    expect(body.quality).toBe('medium');
  });
  test.each([
    ['gpt-6-astra', 'prompt=fixture', '--edit'],
    ['gpt-image-2-ga', 'prompt=fixture', '--edit'],
    ['gpt-image-2-ga', 'prompt=fixture', 'image=https://example.com/a.png', '--edit'],
    ['gpt-image-2-ga', 'prompt=fixture', '--async', '--webhook', 'https://example.com/hook'],
  ].map(args => ({ args })))('rejects unsupported or malformed edit invocation: %j', ({ args }) => {
    const res = preview(args);
    expect(res.code).toBe(1);
    expect(res.stderr).not.toContain('[DRY RUN] POST');
  });
});
