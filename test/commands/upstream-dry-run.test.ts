import { afterAll, describe, expect, test } from 'bun:test';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { getModel, MODELS } from '../../src/models/catalog';
import { getModelSchema } from '../../src/models/schema';
import { UPSTREAM_MODELS } from '../fixtures/upstream-models';

const home = mkdtempSync(join(tmpdir(), 'piapi-cli-dry-run-'));
const main = fileURLToPath(new URL('../../src/main.ts', import.meta.url));
const baseUrl = 'http://127.0.0.1:1';

afterAll(() => rmSync(home, { recursive: true, force: true }));

function dryRun(name: string, input: Record<string, unknown>, extra: string[] = []) {
  const args = Object.entries(input).map(([key, value]) => `${key}:=${JSON.stringify(value)}`);
  const result = Bun.spawnSync({
    cmd: [process.execPath, main, 'run', name, ...args, ...extra,
      '--dry-run', '--quiet', '--non-interactive', '--output', 'json', '--base-url', baseUrl],
    env: { ...process.env, HOME: home, PIAPI_API_KEY: '', CLI_VERSION: '0.0.0-dev' },
    stdout: 'pipe', stderr: 'pipe', timeout: 5000,
  });
  const stderr = result.stderr.toString();
  expect(result.exitCode, stderr).toBe(0);
  expect(result.stdout.toString()).toBe('');
  expect(stderr).not.toContain('fixture-key');
  const body = stderr.split('[DRY RUN] Body: ')[1];
  expect(body, stderr).toBeDefined();
  return { path: stderr.split('\n')[0], body: JSON.parse(body!) as Record<string, unknown> };
}

describe('official upstream model requests through the real CLI', () => {
  for (const fixture of UPSTREAM_MODELS) {
    test(fixture.name, () => {
      const model = getModel(fixture.name);
      expect(model).toMatchObject({ name: fixture.name, model: fixture.model, type: fixture.type, verified: true });
      expect(model?.apiType ?? 'unified').toBe(fixture.apiType);
      expect(getModelSchema(fixture.name)).not.toBeNull();
      const result = dryRun(fixture.name, fixture.input);
      if (fixture.apiType === 'unified') {
        expect(model?.asyncOnly).toBe(true);
        expect(result.path).toBe(`[DRY RUN] POST ${baseUrl}/api/v1/task`);
        expect(result.body).toEqual({
          model: fixture.model, task_type: fixture.taskType, input: fixture.input,
          ...(fixture.config ? { config: fixture.config } : {}),
        });
      } else if (fixture.apiType === 'openai-images') {
        expect(result.path).toBe(`[DRY RUN] POST ${baseUrl}/v1/images/generations`);
        expect(result.body).toEqual({ model: fixture.model, ...fixture.defaults, ...fixture.input });
      } else {
        expect(result.path).toBe(`[DRY RUN] POST ${baseUrl}/v1/chat/completions`);
        expect(result.body).toEqual({ model: fixture.model, messages: [{ role: 'user', content: 'fixture' }] });
      }
    });
  }

  test('keeps the existing GPT Image 2 alias on preview billing', () => {
    expect(dryRun('gpt-image-2', { prompt: 'fixture' }).body)
      .toEqual({ model: 'gpt-image-2-preview', prompt: 'fixture' });
  });

  test('removes stopped services without adding marketing-only runtimes', () => {
    expect(MODELS).toHaveLength(111);
    expect(MODELS.some(model => model.provider === 'Midjourney')).toBe(false);
    expect(getModel('claude-fable-5')).toBeUndefined();
    expect(getModel('suno')).toBeUndefined();
  });
});

describe('multi-step inputs are preserved without injected prompt or defaults', () => {
  test('Seedance draft step 1', () => {
    const input = { prompt: 'fixture', draft: true, resolution: '480p', duration: 8 };
    expect(dryRun('seedance-2.5', input).body.input).toEqual(input);
  });

  for (const name of ['seedance-2.5', 'seedance-2.5-less-restriction']) {
    test(`${name} draft finalization without a prompt`, () => {
      const input = { draft_task_id: 'completed-draft', resolution: '1080p' };
      expect(dryRun(name, input).body.input).toEqual(input);
    });
  }

  test('Seedance less-restriction edit retains negative duration and false auto-upload', () => {
    const input = {
      prompt: 'Change the lighting in @video1', mode: 'omni_reference',
      omni_reference_task_type: 'edit', video_urls: ['https://example.com/source.mp4'],
      aspect_ratio: 'adaptive', duration: -1, auto_upload_assets: false,
    };
    expect(dryRun('seedance-2.5-less-restriction', input).body.input).toEqual(input);
  });

  test('Seedance extend preserves the declared task type and references', () => {
    const input = {
      prompt: 'Extend @video1 forward', mode: 'omni_reference', omni_reference_task_type: 'extend',
      video_urls: ['https://example.com/source.mp4'], aspect_ratio: 'adaptive', duration: 8,
    };
    expect(dryRun('seedance-2.5', input).body.input).toEqual(input);
  });

  test('Meshy refine uses the completed preview without injecting a prompt', () => {
    const input = { mode: 'refine', preview_task_id: 'completed-preview' };
    expect(dryRun('meshy-txt', input).body).toEqual({
      model: 'meshy', task_type: 'text-to-3d', input, config: { service_mode: 'public' },
    });
  });

  test('keeps required public service mode when adding a webhook', () => {
    expect(dryRun('minimax-h3', { prompt: 'fixture' }, ['--webhook', 'https://example.com/hook']).body.config)
      .toEqual({ service_mode: 'public', webhook_config: { endpoint: 'https://example.com/hook' } });
  });

  test('does not require credentials or open a local file in dry-run', () => {
    const input = { image_url: '@/nonexistent/reference.png' };
    expect(dryRun('meshy', input).body.input).toEqual(input);
  });

  test('keeps private-asset references literal on the documented Seedance 2 route', () => {
    const input = { prompt: 'fixture', image_urls: ['asset://fixture-asset'], auto_upload_assets: false };
    expect(dryRun('seedance-2-less-restriction', input).body.input).toEqual(input);
  });

  test('new chat models preserve explicit messages and streaming opt-in', () => {
    const messages = [{ role: 'user', content: 'fixture' }];
    expect(dryRun('gpt-6-astra', { messages }, ['--stream']).body)
      .toEqual({ model: 'gpt-6-astra', messages, stream: true });
  });
});
