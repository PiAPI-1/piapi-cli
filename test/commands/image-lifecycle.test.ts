import { describe, expect, test } from 'bun:test';
import { mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const built = process.env.PIAPI_TEST_BUILT === '1';
const main = fileURLToPath(new URL(built ? '../../dist/piapi.mjs' : '../../src/main.ts', import.meta.url));
const guard = fileURLToPath(new URL('../fixtures/loopback-fetch.ts', import.meta.url));

describe('real CLI image lifecycle against a loopback-only fixture', () => {
  test('sync edit, async generation/edit, task get/wait and base64 downloads', async () => {
    const home = mkdtempSync(join(tmpdir(), 'piapi-images-loopback-'));
    const image = join(home, 'subject.png');
    const reference = join(home, 'style.webp');
    writeFileSync(image, 'subject-bytes');
    writeFileSync(reference, 'style-bytes');
    const calls: string[] = [];
    const tasks = new Map<string, string>();
    const key = 'local-fixture-key';
    const server = Bun.serve({ port: 0, async fetch(req) {
      const path = new URL(req.url).pathname;
      calls.push(path);
      if (req.method === 'GET') {
        expect(req.headers.get('X-API-Key')).toBe(key);
        const id = path.split('/').pop()!;
        expect(tasks.has(id)).toBe(true);
        return Response.json({ task_id: id, task_type: tasks.get(id), status: 'completed',
          output: { data: [{ b64_json: Buffer.from('output-bytes').toString('base64') }] } });
      }
      const asyncMode = path.startsWith('/api/');
      expect(req.headers.get(asyncMode ? 'X-API-Key' : 'Authorization')).toBe(asyncMode ? key : `Bearer ${key}`);
      expect(req.headers.get(asyncMode ? 'Authorization' : 'X-API-Key')).toBeNull();
      if (path.includes('/edits')) {
        expect(req.headers.get('Content-Type')).toContain('multipart/form-data; boundary=');
        const form = await req.formData();
        expect(form.get('model')).toBe('gpt-image-2');
        expect(form.get('quality')).toBe('medium');
        expect(form.get('prompt')).toBe('fixture');
        const files = form.getAll(asyncMode ? 'image[]' : 'image') as File[];
        expect(files).toHaveLength(asyncMode ? 2 : 1);
        expect(await files[0]!.text()).toBe('subject-bytes');
        if (asyncMode) expect(await files[1]!.text()).toBe('style-bytes');
      } else {
        expect(await req.json()).toEqual({ model: 'gpt-image-2', quality: 'medium', prompt: 'fixture' });
      }
      if (asyncMode) {
        const id = path.includes('/edits') ? 'edit-task' : 'generation-task';
        tasks.set(id, path.includes('/edits') ? 'gpt-image-edit' : 'gpt-image-generation');
        return Response.json({ task_id: id, status: 'pending', output: null });
      }
      return Response.json({ data: [{ b64_json: Buffer.from('output-bytes').toString('base64') }] });
    } });
    const base = `http://127.0.0.1:${server.port}`;
    async function cli(args: string[]) {
      const child = Bun.spawn({ cmd: [...(built ? ['node', '--import', guard] : [process.execPath, '--preload', guard]), main, ...args,
        '--api-key', key, '--base-url', base, '--quiet', '--non-interactive', '--output', 'json'],
        env: { ...process.env, HOME: home, PIAPI_API_KEY: '', PIAPI_FIXTURE_ORIGIN: base, PIAPI_TIMEOUT_MS: '3000', PIAPI_NO_UPDATE_CHECK: '1' },
        stdout: 'pipe', stderr: 'pipe', timeout: 5000 });
      const [stdout, stderr, code] = await Promise.all([
        new Response(child.stdout).text(), new Response(child.stderr).text(), child.exited,
      ]);
      expect(code, stderr).toBe(0);
      return JSON.parse(stdout) as Record<string, unknown>;
    }
    try {
      const outDir = join(home, 'out');
      await cli(['run', 'gpt-image-2-ga', 'prompt=fixture', `image=@${image}`, '--edit', '--download', '--out-dir', outDir]);
      for (const edit of [false, true]) {
        const shell = await cli(['run', 'gpt-image-2-ga', 'prompt=fixture', '--async',
          ...(edit ? ['--edit', `image:=${JSON.stringify([`@${image}`, `@${reference}`])}`] : [])]);
        expect(shell.status).toBe('pending');
        const id = String(shell.task_id);
        expect((await cli(['task', 'get', id])).status).toBe('completed');
        expect((await cli(['task', 'wait', id, '--download', '--out-dir', outDir])).status).toBe('completed');
      }
      const files = readdirSync(outDir);
      expect(files).toHaveLength(3);
      for (const file of files) expect(readFileSync(join(outDir, file), 'utf-8')).toBe('output-bytes');
      expect(calls.filter(path => path.includes('/edits'))).toHaveLength(2);
      expect(calls.filter(path => path.includes('/generations'))).toHaveLength(1);
      expect(calls.filter(path => path.startsWith('/api/v1/task/'))).toHaveLength(4);
    } finally {
      server.stop(true);
      rmSync(home, { recursive: true, force: true });
    }
  }, 15000);
});
