import { afterEach, beforeEach, describe, expect, mock, spyOn, test } from 'bun:test';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { imageEdit, submitImageTask } from '../../src/client/images';

const client = { apiKey: 'fixture-key', baseUrl: 'https://api.example.com' };

let dir: string;
let originalTimeout: string | undefined;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'piapi-images-'));
  originalTimeout = process.env.PIAPI_TIMEOUT_MS;
  delete process.env.PIAPI_TIMEOUT_MS;
});

afterEach(() => {
  mock.restore();
  rmSync(dir, { recursive: true, force: true });
  if (originalTimeout === undefined) delete process.env.PIAPI_TIMEOUT_MS;
  else process.env.PIAPI_TIMEOUT_MS = originalTimeout;
});

function fixture(name: string, contents = 'fixture-bytes'): string {
  const p = join(dir, name);
  writeFileSync(p, contents);
  return p;
}

function lastCall(fetchSpy: ReturnType<typeof spyOn>): { url: string; init: RequestInit; headers: Headers } {
  const [url, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
  return { url, init, headers: new Headers(init.headers) };
}

describe('imageEdit (sync multipart edit)', () => {
  test('POSTs multipart to /v1/images/edits with Bearer auth and a 120s timeout', async () => {
    const file = fixture('ref.png', 'PNG-BYTES');
    const timeout = spyOn(AbortSignal, 'timeout');
    const fetchSpy = spyOn(globalThis, 'fetch').mockResolvedValue(
      Response.json({ created: 1, data: [{ url: 'https://cdn.example.com/out.png' }] }),
    );

    const res = await imageEdit(client, { model: 'gpt-image-2', prompt: 'fixture', image: `@${file}` });

    expect(res.data[0]?.url).toBe('https://cdn.example.com/out.png');
    const { url, init, headers } = lastCall(fetchSpy);
    expect(url).toBe('https://api.example.com/v1/images/edits');
    expect(init.method).toBe('POST');
    expect(headers.get('authorization')).toBe('Bearer fixture-key');
    // fetch must set the multipart boundary itself
    expect(headers.get('content-type')).toBeNull();
    expect(init.body).toBeInstanceOf(FormData);
    expect(await ((init.body as FormData).get('image') as File).text()).toBe('PNG-BYTES');
    expect(timeout).toHaveBeenCalledWith(120_000);
  });

  test('sends repeated image[] fields in order', async () => {
    const first = fixture('a.png', 'FIRST');
    const second = fixture('b.png', 'SECOND');
    const fetchSpy = spyOn(globalThis, 'fetch').mockResolvedValue(Response.json({ data: [] }));

    await imageEdit(client, { model: 'gpt-image-2', prompt: 'p', image: [`@${first}`, `@${second}`] });

    const parts = (lastCall(fetchSpy).init.body as FormData).getAll('image[]') as File[];
    expect(parts.map((p) => p.name)).toEqual(['a.png', 'b.png']);
    expect(await parts[0]!.text()).toBe('FIRST');
    expect(await parts[1]!.text()).toBe('SECOND');
  });

  test('preserves the upstream error message', async () => {
    fixture('ref.png');
    spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ error: { message: 'upstream boom' } }), { status: 400 }),
    );
    await expect(imageEdit(client, { model: 'm', prompt: 'p', image: `@${join(dir, 'ref.png')}` }))
      .rejects.toThrow('upstream boom');
  });

  test.each(['<html>proxy response</html>', ''])('reports malformed HTTP 200 edit bodies as API errors: %j', async body => {
    const file = fixture('ref.png');
    spyOn(globalThis, 'fetch').mockResolvedValue(new Response(body, { status: 200 }));
    await expect(imageEdit(client, { model: 'm', prompt: 'p', image: `@${file}` }))
      .rejects.toMatchObject({ name: 'APIError', statusCode: 200, message: 'Unexpected image edit response: invalid JSON (HTTP 200).' });
  });

  test('fails on a missing local file before any fetch', async () => {
    const fetchSpy = spyOn(globalThis, 'fetch');
    await expect(imageEdit(client, { model: 'm', prompt: 'p', image: `@${join(dir, 'gone.png')}` }))
      .rejects.toThrow(/not found/i);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  test('does not retry a timed-out edit', async () => {
    fixture('ref.png');
    const fetchSpy = spyOn(globalThis, 'fetch').mockRejectedValue(new DOMException('fixture timeout', 'TimeoutError'));
    await expect(imageEdit(client, { model: 'm', prompt: 'p', image: `@${join(dir, 'ref.png')}` }))
      .rejects.toThrow(/120000ms/);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  test('honours the PIAPI_TIMEOUT_MS override', async () => {
    process.env.PIAPI_TIMEOUT_MS = '4321';
    fixture('ref.png');
    const timeout = spyOn(AbortSignal, 'timeout');
    spyOn(globalThis, 'fetch').mockResolvedValue(Response.json({ data: [] }));
    await imageEdit(client, { model: 'm', prompt: 'p', image: `@${join(dir, 'ref.png')}` });
    expect(timeout).toHaveBeenCalledWith(4321);
  });
});

describe('submitImageTask (async submit)', () => {
  test('generations: POSTs JSON to /api/v1/images/generations/async with X-API-Key and a 30s timeout', async () => {
    const timeout = spyOn(AbortSignal, 'timeout');
    const fetchSpy = spyOn(globalThis, 'fetch').mockResolvedValue(
      Response.json({ task_id: 'task-1', task_type: 'gpt-image-generation', status: 'pending', output: null }),
    );

    const task = await submitImageTask(client, { model: 'gpt-image-2', prompt: 'a red panda', n: 1 }, false);

    expect(task.task_id).toBe('task-1');
    expect(task.status).toBe('pending');
    const { url, init, headers } = lastCall(fetchSpy);
    expect(url).toBe('https://api.example.com/api/v1/images/generations/async');
    expect(init.method).toBe('POST');
    expect(headers.get('x-api-key')).toBe('fixture-key');
    expect(headers.get('authorization')).toBeNull();
    expect(headers.get('content-type')).toBe('application/json');
    expect(JSON.parse(String(init.body))).toMatchObject({ model: 'gpt-image-2', prompt: 'a red panda', n: 1 });
    expect(timeout).toHaveBeenCalledWith(30_000);
  });

  test('edits: POSTs multipart to /api/v1/images/edits/async with X-API-Key and a 120s timeout', async () => {
    const file = fixture('ref.png', 'PNG-BYTES');
    const timeout = spyOn(AbortSignal, 'timeout');
    const fetchSpy = spyOn(globalThis, 'fetch').mockResolvedValue(
      Response.json({ task_id: 'task-2', status: 'pending' }),
    );

    const task = await submitImageTask(client, { model: 'gpt-image-2', prompt: 'p', image: `@${file}` }, true);

    expect(task.task_id).toBe('task-2');
    const { url, init, headers } = lastCall(fetchSpy);
    expect(url).toBe('https://api.example.com/api/v1/images/edits/async');
    expect(headers.get('x-api-key')).toBe('fixture-key');
    expect(headers.get('authorization')).toBeNull();
    expect(headers.get('content-type')).toBeNull(); // multipart boundary set by fetch
    expect(await ((init.body as FormData).get('image') as File).text()).toBe('PNG-BYTES');
    expect(timeout).toHaveBeenCalledWith(120_000);
  });

  test('starts the async edit timeout only after local validation succeeds', async () => {
    const timeout = spyOn(AbortSignal, 'timeout');
    const fetchSpy = spyOn(globalThis, 'fetch');
    await expect(submitImageTask(client, { model: 'm', prompt: 'p', image: `@${join(dir, 'missing.png')}` }, true))
      .rejects.toThrow(/not found/i);
    expect(timeout).not.toHaveBeenCalled();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  test('honours the async edit timeout override without retrying', async () => {
    process.env.PIAPI_TIMEOUT_MS = '4321';
    const file = fixture('ref.png');
    const timeout = spyOn(AbortSignal, 'timeout');
    const fetchSpy = spyOn(globalThis, 'fetch').mockRejectedValue(new DOMException('fixture timeout', 'TimeoutError'));
    await expect(submitImageTask(client, { model: 'm', prompt: 'p', image: `@${file}` }, true)).rejects.toThrow(/4321ms/);
    expect(timeout).toHaveBeenCalledWith(4321);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  test('does not retry a timed-out async edit and reports its default deadline', async () => {
    const file = fixture('ref.png');
    const fetchSpy = spyOn(globalThis, 'fetch').mockRejectedValue(new DOMException('fixture timeout', 'TimeoutError'));
    await expect(submitImageTask(client, { model: 'm', prompt: 'p', image: `@${file}` }, true)).rejects.toThrow(/120000ms/);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  test('unwraps the { code, message, data } envelope', async () => {
    spyOn(globalThis, 'fetch').mockResolvedValue(
      Response.json({ code: 200, message: 'success', data: { task_id: 'task-3', status: 'pending' } }),
    );
    const task = await submitImageTask(client, { model: 'm', prompt: 'p' }, false);
    expect(task.task_id).toBe('task-3');
  });

  test('rejects envelope API errors preserving the message', async () => {
    spyOn(globalThis, 'fetch').mockResolvedValue(
      Response.json({ code: 400, message: 'bad model', data: null }),
    );
    await expect(submitImageTask(client, { model: 'm', prompt: 'p' }, false)).rejects.toThrow('bad model');
  });

  test('rejects HTTP errors preserving the upstream message', async () => {
    spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ message: 'gateway exploded' }), { status: 500 }),
    );
    await expect(submitImageTask(client, { model: 'm', prompt: 'p' }, false)).rejects.toThrow('gateway exploded');
  });

  test.each([
    ['null response', null],
    ['empty object', {}],
    ['unknown status', { task_id: 'task-4', status: 'not-a-task-status' }],
    ['missing status', { task_id: 'task-4' }],
    ['missing task_id', { status: 'pending' }],
  ])('rejects a malformed shell: %s', async (_label, shell) => {
    spyOn(globalThis, 'fetch').mockResolvedValue(Response.json(shell));
    await expect(submitImageTask(client, { model: 'm', prompt: 'p' }, false))
      .rejects.toThrow(/task_id|status|malformed/i);
  });

  test('does not retry a timed-out submit', async () => {
    const fetchSpy = spyOn(globalThis, 'fetch').mockRejectedValue(new DOMException('fixture timeout', 'TimeoutError'));
    await expect(submitImageTask(client, { model: 'm', prompt: 'p' }, false)).rejects.toThrow(/30000ms/);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });
});
