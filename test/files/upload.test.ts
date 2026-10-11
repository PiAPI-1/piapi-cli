import { afterEach, beforeEach, describe, expect, mock, spyOn, test } from 'bun:test';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { uploadFile } from '../../src/files/upload';

let dir: string;
let file: string;
const url = 'https://cdn.example.com/reference.png';

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'piapi-upload-'));
  file = join(dir, 'reference.png');
  writeFileSync(file, 'fixture');
});

afterEach(() => {
  mock.restore();
  rmSync(dir, { recursive: true, force: true });
});

describe('ephemeral upload response', () => {
  test('reads the documented envelope without changing the upload request', async () => {
    const fetch = spyOn(globalThis, 'fetch').mockResolvedValue(
      Response.json({ code: 200, message: 'success', data: { url } }),
    );
    expect(await uploadFile('fixture-key', file)).toEqual({ url, filename: 'reference.png' });
    expect(fetch).toHaveBeenCalledTimes(1);
    const [endpoint, options] = fetch.mock.calls[0]!;
    expect(endpoint).toBe('https://upload.theapi.app/api/ephemeral_resource');
    expect(options?.headers).toEqual({ 'Content-Type': 'application/json', 'X-API-Key': 'fixture-key' });
    expect(JSON.parse(String(options?.body))).toEqual({ file_name: 'reference.png', file_data: 'Zml4dHVyZQ==' });
  });

  test('retains legacy top-level URL compatibility', async () => {
    spyOn(globalThis, 'fetch').mockResolvedValue(Response.json({ url }));
    expect(await uploadFile('fixture-key', file)).toEqual({ url, filename: 'reference.png' });
  });

  test.each([{}, null, { data: {} }, { data: { url: '' } }, { data: { url: 12 } }])(
    'rejects a missing or malformed URL: %j',
    async payload => {
      spyOn(globalThis, 'fetch').mockResolvedValue(Response.json(payload));
      await expect(uploadFile('fixture-key', file)).rejects.toThrow(/upload|url/i);
    },
  );

  test('rejects an API error envelope even with an HTTP 200 status', async () => {
    spyOn(globalThis, 'fetch').mockResolvedValue(
      Response.json({ code: 403, message: 'Insufficient plan level', data: { url } }),
    );
    await expect(uploadFile('fixture-key', file)).rejects.toThrow(/Insufficient plan level/);
  });
});
