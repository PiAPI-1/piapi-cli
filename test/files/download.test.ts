import { describe, expect, test } from 'bun:test';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, basename } from 'node:path';
import { saveBase64, downloadUrl } from '../../src/files/download';

describe('download filename collisions', () => {
  test('saveBase64 never overwrites — appends -1, -2 before the extension', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'piapi-dl-'));
    try {
      const b64 = (s: string) => Buffer.from(s).toString('base64');
      const p1 = await saveBase64(b64('first'), 'image.png', { outDir: dir, quiet: true });
      const p2 = await saveBase64(b64('second'), 'image.png', { outDir: dir, quiet: true });
      const p3 = await saveBase64(b64('third'), 'image.png', { outDir: dir, quiet: true });
      expect(basename(p1)).toBe('image.png');
      expect(basename(p2)).toBe('image-1.png');
      expect(basename(p3)).toBe('image-2.png');
      expect(readFileSync(p1, 'utf-8')).toBe('first');
      expect(readFileSync(p2, 'utf-8')).toBe('second');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test('downloadUrl uniquifies same-basename URLs from different paths', async () => {
    const server = Bun.serve({
      port: 0,
      fetch: (req) => new Response(new URL(req.url).pathname),
    });
    const dir = mkdtempSync(join(tmpdir(), 'piapi-dl-'));
    try {
      const base = `http://localhost:${server.port}`;
      const p1 = await downloadUrl(`${base}/a/result.png`, { outDir: dir, quiet: true });
      const p2 = await downloadUrl(`${base}/b/result.png`, { outDir: dir, quiet: true });
      expect(basename(p1)).toBe('result.png');
      expect(basename(p2)).toBe('result-1.png');
      expect(readFileSync(p1, 'utf-8')).toBe('/a/result.png');
      expect(readFileSync(p2, 'utf-8')).toBe('/b/result.png');
    } finally {
      server.stop(true);
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
