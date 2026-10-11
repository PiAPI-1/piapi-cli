import { afterEach, describe, expect, mock, spyOn, test } from 'bun:test';
import run from '../../src/commands/run';
import { MODELS, type ModelEntry } from '../../src/models/catalog';

afterEach(() => {
  mock.restore();
  const index = MODELS.findIndex(model => model.name === 'fixture-config');
  if (index !== -1) MODELS.splice(index, 1);
});

describe('unified request config', () => {
  test.each([undefined, 'https://example.com/webhook'])('preserves model config with webhook %s', async webhook => {
    const model: ModelEntry & { defaultConfig: { service_mode: 'public' } } = {
      name: 'fixture-config', type: 'video', model: 'fixture', taskType: 'txt2video',
      provider: 'Fixture', defaultConfig: { service_mode: 'public' },
    };
    MODELS.push(model);
    const stderr = spyOn(process.stderr, 'write').mockImplementation(() => true);
    const fetch = spyOn(globalThis, 'fetch').mockRejectedValue(new Error('dry-run must not fetch'));
    await run.execute({ baseUrl: 'https://api.example.com' }, {
      _positional: ['fixture-config', 'prompt=fixture'], dryRun: true, quiet: true, webhook,
    });
    const output = stderr.mock.calls.map(call => String(call[0])).join('');
    const body = JSON.parse(output.split('[DRY RUN] Body: ')[1]!);
    expect(body.config).toEqual({
      service_mode: 'public',
      ...(webhook ? { webhook_config: { endpoint: webhook } } : {}),
    });
    expect(body.input).toEqual({ prompt: 'fixture' });
    expect(fetch).not.toHaveBeenCalled();
  });

  test('sends a documented empty config without inventing a service mode', async () => {
    const model = {
      name: 'fixture-config', type: '3d' as const, model: 'fixture', taskType: 'rig',
      provider: 'Fixture', defaultConfig: {},
    };
    MODELS.push(model);
    const stderr = spyOn(process.stderr, 'write').mockImplementation(() => true);
    await run.execute({ baseUrl: 'https://api.example.com' }, {
      _positional: ['fixture-config', 'model=https://example.com/mesh.glb'], dryRun: true, quiet: true,
    });
    const output = stderr.mock.calls.map(call => String(call[0])).join('');
    expect(JSON.parse(output.split('[DRY RUN] Body: ')[1]!).config).toEqual({});
  });
});
