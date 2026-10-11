import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { mkdtempSync, writeFileSync, symlinkSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildImageEditForm, MAX_IMAGE_BYTES, validateImageEditInput } from '../../src/files/image-parts';

let dir: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'piapi-image-parts-'));
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

function fixture(name: string, contents: string | Buffer = 'fixture-bytes'): string {
  const p = join(dir, name);
  writeFileSync(p, contents);
  return p;
}

const base = { model: 'gpt-image-2', prompt: 'fixture prompt' };

describe('validateImageEditInput', () => {
  test('accepts a single @file image and never touches disk (dry-run safe)', () => {
    // A nonexistent path must pass shape validation: no IO allowed here.
    expect(() => validateImageEditInput({ ...base, image: '@/definitely/not/on/disk.png' })).not.toThrow();
  });

  test('accepts an ordered array of 1 to 16 @file references', () => {
    expect(() => validateImageEditInput({ ...base, image: ['@a.png'] })).not.toThrow();
    expect(() =>
      validateImageEditInput({ ...base, image: Array.from({ length: 16 }, (_, i) => `@r${i}.png`) }),
    ).not.toThrow();
  });

  test('rejects zero and seventeen references', () => {
    expect(() => validateImageEditInput({ ...base, image: [] })).toThrow(/1.*16/);
    expect(() =>
      validateImageEditInput({ ...base, image: Array.from({ length: 17 }, (_, i) => `@r${i}.png`) }),
    ).toThrow(/1.*16/);
  });

  test('rejects missing, empty, or non-string prompt', () => {
    expect(() => validateImageEditInput({ model: 'm', image: '@a.png' } as never)).toThrow(/prompt/);
    expect(() => validateImageEditInput({ ...base, prompt: '  ', image: '@a.png' })).toThrow(/prompt/);
    expect(() => validateImageEditInput({ ...base, prompt: 3, image: '@a.png' } as never)).toThrow(/prompt/);
  });

  test('rejects a missing image field', () => {
    expect(() => validateImageEditInput({ ...base })).toThrow(/image/);
  });

  test('rejects URL and bare-path image references instead of fetching or uploading them', () => {
    expect(() => validateImageEditInput({ ...base, image: 'https://example.com/a.png' })).toThrow(/@/);
    expect(() => validateImageEditInput({ ...base, image: '/tmp/a.png' })).toThrow(/@/);
    expect(() =>
      validateImageEditInput({ ...base, image: ['@a.png', 'https://example.com/b.png'] }),
    ).toThrow(/@/);
  });

  test('rejects a mask that is not a @file reference', () => {
    expect(() =>
      validateImageEditInput({ ...base, image: '@a.png', mask: 'https://example.com/m.png' }),
    ).toThrow(/mask/i);
  });

  test('rejects nested objects and arrays outside the image array', () => {
    expect(() =>
      validateImageEditInput({ ...base, image: '@a.png', extra: { nested: true } }),
    ).toThrow(/nested/i);
    expect(() =>
      validateImageEditInput({ ...base, image: '@a.png', extra: ['x'] }),
    ).toThrow(/nested/i);
  });

  test('omits null and undefined values instead of rejecting them', () => {
    expect(() =>
      validateImageEditInput({ ...base, image: '@a.png', optional_field: null, quality: undefined }),
    ).not.toThrow();
  });
});

describe('buildImageEditForm', () => {
  test('sends a single reference as the image field with exact bytes', async () => {
    const file = fixture('ref.png', 'PNG-BYTES');
    const form = await buildImageEditForm({ ...base, image: `@${file}`, quality: 'medium', n: 1 });

    const part = form.get('image') as File;
    // duck-typed: Node 18 has no global File, so assert behaviour not identity
    expect(typeof part.text).toBe('function');
    expect(part.name).toBe('ref.png');
    expect(part.type).toBe('image/png');
    expect(await part.text()).toBe('PNG-BYTES');
    expect(form.getAll('image[]')).toHaveLength(0);
    expect(form.get('model')).toBe('gpt-image-2');
    expect(form.get('prompt')).toBe('fixture prompt');
    expect(form.get('quality')).toBe('medium');
    expect(form.get('n')).toBe('1');
  });

  test('repeats image[] in order for multiple references', async () => {
    const first = fixture('a.png', 'FIRST');
    const second = fixture('b.webp', 'SECOND');
    const form = await buildImageEditForm({ ...base, image: [`@${first}`, `@${second}`] });

    expect(form.get('image')).toBeNull();
    const parts = form.getAll('image[]') as File[];
    expect(parts.map((p) => p.name)).toEqual(['a.png', 'b.webp']);
    expect(await parts[0]!.text()).toBe('FIRST');
    expect(await parts[1]!.text()).toBe('SECOND');
    expect(parts[1]!.type).toBe('image/webp');
  });

  test('appends an optional mask as a file field', async () => {
    const image = fixture('ref.png');
    const mask = fixture('mask.png', 'MASK');
    const form = await buildImageEditForm({ ...base, image: `@${image}`, mask: `@${mask}` });
    const part = form.get('mask') as File;
    expect(part.name).toBe('mask.png');
    expect(await part.text()).toBe('MASK');
  });

  test('omits null and undefined scalar fields', async () => {
    const image = fixture('ref.png');
    const form = await buildImageEditForm({ ...base, image: `@${image}`, optional_field: null, quality: undefined });
    expect(form.get('optional_field')).toBeNull();
    expect(form.get('quality')).toBeNull();
  });

  test('fails on a missing file before anything is fetched', async () => {
    await expect(buildImageEditForm({ ...base, image: `@${join(dir, 'gone.png')}` }))
      .rejects.toThrow(/not found/i);
  });

  test('rejects symlinks', async () => {
    const target = fixture('real.png');
    const link = join(dir, 'link.png');
    symlinkSync(target, link);
    await expect(buildImageEditForm({ ...base, image: `@${link}` })).rejects.toThrow(/symlink/i);
  });

  test('rejects directories and device files', async () => {
    await expect(buildImageEditForm({ ...base, image: `@${dir}` })).rejects.toThrow(/regular file/i);
    await expect(buildImageEditForm({ ...base, image: '@/dev/null' })).rejects.toThrow(/regular file/i);
  });

  test('rejects unsupported extensions, accepts them case-insensitively', async () => {
    const gif = fixture('anim.gif');
    await expect(buildImageEditForm({ ...base, image: `@${gif}` })).rejects.toThrow(/unsupported image format/i);
    const upper = fixture('PHOTO.JPEG');
    const form = await buildImageEditForm({ ...base, image: `@${upper}` });
    expect((form.get('image') as File).type).toBe('image/jpeg');
  });

  test('a bad later reference rejects the whole batch before any form is produced', async () => {
    const good = fixture('good.png');
    await expect(
      buildImageEditForm({ ...base, image: [`@${good}`, `@${join(dir, 'missing.png')}`] }),
    ).rejects.toThrow(/not found/i);
  });

  test('enforces the 25 MB per-file limit at the boundary', async () => {
    const over = fixture('over.png', Buffer.alloc(MAX_IMAGE_BYTES + 1, 1));
    await expect(buildImageEditForm({ ...base, image: `@${over}` })).rejects.toThrow(/25 ?MB/i);
    const exact = fixture('exact.png', Buffer.alloc(MAX_IMAGE_BYTES, 1));
    await expect(buildImageEditForm({ ...base, image: `@${exact}` })).resolves.toBeInstanceOf(FormData);
  });
});
