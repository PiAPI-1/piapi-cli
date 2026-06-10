import { describe, test, expect } from 'bun:test';
import { mkdtempSync, existsSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { extractUrls, renderUnifiedResult } from '../../src/output/task-result';
import { CLIError } from '../../src/errors/base';
import { ExitCode } from '../../src/errors/codes';
import type { TaskData } from '../../src/types/api';

function completedTask(output: Record<string, unknown>): TaskData {
  return { task_id: 't-123', task_type: 'txt2img', status: 'completed', output };
}

describe('extractUrls', () => {
  test('walks nested objects and arrays with key paths', () => {
    const urls = extractUrls({
      image_url: 'https://cdn.example.com/a.png',
      works: [{ audio: 'https://cdn.example.com/b.mp3' }, { note: 'not a url' }],
    });
    expect(urls).toEqual([
      { label: 'image_url', url: 'https://cdn.example.com/a.png' },
      { label: 'works[0].audio', url: 'https://cdn.example.com/b.mp3' },
    ]);
  });
});

describe('renderUnifiedResult', () => {
  test('downloads outputs even in JSON output mode', async () => {
    const server = Bun.serve({
      port: 0,
      fetch: () => new Response('fake-png-bytes'),
    });
    const outDir = mkdtempSync(join(tmpdir(), 'piapi-test-'));
    try {
      const url = `http://localhost:${server.port}/result.png`;
      await renderUnifiedResult(completedTask({ image_url: url }), {
        title: 'flux-dev',
        flags: { output: 'json', download: true, outDir, quiet: true },
      });
      const saved = join(outDir, 'result.png');
      expect(existsSync(saved)).toBe(true);
      expect(readFileSync(saved, 'utf-8')).toBe('fake-png-bytes');
    } finally {
      server.stop(true);
      rmSync(outDir, { recursive: true, force: true });
    }
  });

  test('throws API_ERROR for failed task even in JSON output mode', async () => {
    const task: TaskData = {
      task_id: 't-456',
      task_type: 'txt2img',
      status: 'failed',
      error: { code: 500, message: 'model exploded' },
    };
    const p = renderUnifiedResult(task, { title: 'flux-dev', flags: { output: 'json', quiet: true } });
    await expect(p).rejects.toBeInstanceOf(CLIError);
    await p.catch((e: CLIError) => {
      expect(e.code).toBe(ExitCode.API_ERROR);
      expect(e.message).toContain('t-456');
      expect(e.message).toContain('model exploded');
    });
  });

  test('throws API_ERROR for cancelled task', async () => {
    const task: TaskData = { task_id: 't-789', task_type: 'txt2img', status: 'cancelled' };
    const p = renderUnifiedResult(task, { title: 'flux-dev', flags: { output: 'json', quiet: true } });
    await expect(p).rejects.toBeInstanceOf(CLIError);
  });
});
