import { afterEach, beforeEach, describe, expect, mock, spyOn, test } from 'bun:test';
import { chatCompletion, imageGeneration } from '../../src/client/openai-compat';

const client = { apiKey: 'fixture-key', baseUrl: 'https://api.example.com' };
let originalTimeout: string | undefined;

beforeEach(() => {
  originalTimeout = process.env.PIAPI_TIMEOUT_MS;
  delete process.env.PIAPI_TIMEOUT_MS;
});

afterEach(() => {
  mock.restore();
  if (originalTimeout === undefined) delete process.env.PIAPI_TIMEOUT_MS;
  else process.env.PIAPI_TIMEOUT_MS = originalTimeout;
});

describe('OpenAI-compatible request timeouts', () => {
  test('gives synchronous images a bounded 120-second timeout', async () => {
    const timeout = spyOn(AbortSignal, 'timeout');
    const fetch = spyOn(globalThis, 'fetch').mockResolvedValue(Response.json({ data: [] }));
    await imageGeneration(client, { model: 'gpt-image-2.5-sunburst', prompt: 'fixture' });
    expect(timeout).toHaveBeenCalledWith(120_000);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch.mock.calls[0]?.[0]).toBe('https://api.example.com/v1/images/generations');
  });

  test('preserves the 30-second chat timeout', async () => {
    const timeout = spyOn(AbortSignal, 'timeout');
    spyOn(globalThis, 'fetch').mockResolvedValue(Response.json({ choices: [] }));
    await chatCompletion(client, { model: 'gpt-6-astra', messages: [{ role: 'user', content: 'fixture' }] });
    expect(timeout).toHaveBeenCalledWith(30_000);
  });

  test('applies the environment override to images', async () => {
    process.env.PIAPI_TIMEOUT_MS = '4567';
    const timeout = spyOn(AbortSignal, 'timeout');
    spyOn(globalThis, 'fetch').mockResolvedValue(Response.json({ data: [] }));
    await imageGeneration(client, { model: 'gpt-image-2.5-flare', prompt: 'fixture' });
    expect(timeout).toHaveBeenCalledWith(4567);
  });

  test('does not retry a timed-out image request', async () => {
    const fetch = spyOn(globalThis, 'fetch').mockRejectedValue(new DOMException('fixture timeout', 'TimeoutError'));
    await expect(imageGeneration(client, { model: 'gpt-image-2.5-sunburst', prompt: 'fixture' }))
      .rejects.toThrow(/120000ms/);
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});
