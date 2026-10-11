import type { ApiType, ModelType } from '../../src/models/catalog';
import type { CreateTaskRequest } from '../../src/types/api';

export interface UpstreamModelFixture {
  name: string;
  model: string;
  type: ModelType;
  apiType: ApiType;
  taskType?: string;
  input: Record<string, unknown>;
  defaults?: Record<string, unknown>;
  config?: CreateTaskRequest['config'];
}

// Independent request expectations from the official endpoint docs, not the catalog.
// docs: https://piapi.ai/docs/seedance-api/seedance-25.md and seedance-2.md
export const UPSTREAM_MODELS: UpstreamModelFixture[] = [
  { name: 'seedance-2.5', model: 'seedance', type: 'video', apiType: 'unified', taskType: 'seedance-2.5', input: { prompt: 'fixture' } },
  { name: 'seedance-2.5-less-restriction', model: 'seedance', type: 'video', apiType: 'unified', taskType: 'seedance-2.5-less-restriction', input: { prompt: 'fixture' } },
  { name: 'seedance-2-mini', model: 'seedance', type: 'video', apiType: 'unified', taskType: 'seedance-2-mini', input: { prompt: 'fixture' } },
  { name: 'seedance-2-mini-less-restriction', model: 'seedance', type: 'video', apiType: 'unified', taskType: 'seedance-2-mini-less-restriction', input: { prompt: 'fixture' } },
  // docs: https://piapi.ai/docs/minimax-api/generate-video.md
  { name: 'minimax-h3', model: 'Qubico/minimax-h3', type: 'video', apiType: 'unified', taskType: 'txt2video', input: { prompt: 'fixture' }, config: { service_mode: 'public' } },
  { name: 'minimax-h3-img2vid', model: 'Qubico/minimax-h3', type: 'video', apiType: 'unified', taskType: 'img2video', input: { prompt: 'fixture', image: 'https://example.com/reference.png' }, config: { service_mode: 'public' } },
  { name: 'minimax-h3-nsfw', model: 'Qubico/minimax-h3-nsfw', type: 'video', apiType: 'unified', taskType: 'txt2video', input: { prompt: 'fixture' }, config: { service_mode: 'public' } },
  { name: 'minimax-h3-nsfw-img2vid', model: 'Qubico/minimax-h3-nsfw', type: 'video', apiType: 'unified', taskType: 'img2video', input: { prompt: 'fixture', image: 'https://example.com/reference.png' }, config: { service_mode: 'public' } },
  // docs: https://piapi.ai/docs/meshy-api/create-task.md
  { name: 'meshy', model: 'meshy', type: '3d', apiType: 'unified', taskType: 'image-to-3d', input: { image_url: 'https://example.com/reference.png' }, config: { service_mode: 'public' } },
  { name: 'meshy-txt', model: 'meshy', type: '3d', apiType: 'unified', taskType: 'text-to-3d', input: { mode: 'preview', prompt: 'fixture' }, config: { service_mode: 'public' } },
  // docs: https://piapi.ai/docs/tools/skin-tokens-api.md
  { name: 'skin-tokens', model: 'Qubico/skin-tokens', type: '3d', apiType: 'unified', taskType: 'rig', input: { model: 'https://example.com/mesh.glb' } },
  // docs: https://piapi.ai/docs/gpt-image/gpt-image-api.md
  { name: 'gpt-image-2-ga', model: 'gpt-image-2', type: 'image', apiType: 'openai-images', input: { prompt: 'fixture' }, defaults: { quality: 'medium' } },
  { name: 'gpt-image-2-preview', model: 'gpt-image-2-preview', type: 'image', apiType: 'openai-images', input: { prompt: 'fixture' } },
  { name: 'gpt-image-2.5', model: 'gpt-image-2.5', type: 'image', apiType: 'openai-images', input: { prompt: 'fixture' } },
  { name: 'gpt-image-2.5-flare', model: 'gpt-image-2.5-flare', type: 'image', apiType: 'openai-images', input: { prompt: 'fixture' } },
  { name: 'gpt-image-2.5-sunburst', model: 'gpt-image-2.5-sunburst', type: 'image', apiType: 'openai-images', input: { prompt: 'fixture' } },
  // docs: https://piapi.ai/docs/llm-api/completions.md
  { name: 'gpt-5.6-sol', model: 'gpt-5.6-sol', type: 'llm', apiType: 'openai-completions', input: { prompt: 'fixture' } },
  { name: 'gpt-5.6-terra', model: 'gpt-5.6-terra', type: 'llm', apiType: 'openai-completions', input: { prompt: 'fixture' } },
  { name: 'gpt-5.6-luna', model: 'gpt-5.6-luna', type: 'llm', apiType: 'openai-completions', input: { prompt: 'fixture' } },
  { name: 'gpt-6-astra', model: 'gpt-6-astra', type: 'llm', apiType: 'openai-completions', input: { prompt: 'fixture' } },
];
