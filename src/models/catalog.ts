// PiAPI unified API request body shape (verified against docs):
//   { model: "...", task_type: "...", input: {...}, config?: {...} }
// `task_type` is the action (txt2img, video_generation, etc).
// `model` is the variant identifier (Qubico/flux1-dev, kling, etc).
// Some models require fixed input fields (e.g. kling needs input.version):
// see `defaultInput`.
//
// Sources:
//   https://piapi.ai/docs/unified-api-schema.md
//   https://piapi.ai/docs/flux-api/text-to-image.md
//   https://piapi.ai/docs/kling-api/kling-3-api.md
//   etc — each entry carries its docs URL inline.

export type ModelType = 'image' | 'video' | 'audio' | '3d' | 'llm';

// PiAPI exposes two API surfaces:
//   - 'unified'           → POST /api/v1/task   {model, task_type, input}
//                           X-API-Key auth, async task lifecycle, envelope.
//   - 'openai-completions'→ POST /v1/chat/completions  (Bearer auth, sync, no envelope)
//   - 'openai-images'     → POST /v1/images/generations (Bearer auth, sync, no envelope)
// Default is 'unified' when omitted.
export type ApiType = 'unified' | 'openai-completions' | 'openai-images';

export interface ModelEntry {
  name: string;          // user-facing alias
  type: ModelType;
  model: string;         // request `model` field (unified or openai-compat)
  taskType?: string;     // unified API `task_type` (omit for openai-compat)
  provider: string;      // display label
  apiType?: ApiType;     // default 'unified'
  asyncOnly?: boolean;
  defaultInput?: Record<string, unknown>;  // merged into request input/body (user values win)
  verified?: boolean;    // true = real `model` string verified against piapi docs
}

export const MODELS: ModelEntry[] = [
  // ========== image ==========
  // docs: https://piapi.ai/docs/flux-api/text-to-image.md
  { name: 'flux-dev', type: 'image', model: 'Qubico/flux1-dev', taskType: 'txt2img', provider: 'Flux', verified: true },
  { name: 'flux-schnell', type: 'image', model: 'Qubico/flux1-schnell', taskType: 'txt2img', provider: 'Flux', verified: true },
  { name: 'flux-dev-advanced', type: 'image', model: 'Qubico/flux1-dev-advanced', taskType: 'txt2img', provider: 'Flux', verified: true },

  // docs: https://piapi.ai/docs/midjourney-api/imagine.md
  { name: 'midjourney', type: 'image', model: 'midjourney', taskType: 'imagine', provider: 'Midjourney', verified: true },

  // docs: https://piapi.ai/docs/gemini-api/nano-banana-pro.md
  { name: 'nano-banana-pro', type: 'image', model: 'gemini', taskType: 'nano-banana-pro', provider: 'Gemini', verified: true },
  // docs: https://piapi.ai/docs/gemini-api/nano-banana-2.md
  { name: 'nano-banana-2', type: 'image', model: 'gemini', taskType: 'nano-banana-2', provider: 'Gemini', verified: true },
  // docs: https://piapi.ai/docs/gemini-api/gemini-25-flash-image.md
  { name: 'gemini-2.5-flash-image', type: 'image', model: 'gemini', taskType: 'gemini-2.5-flash-image', provider: 'Gemini', verified: true },

  // docs: https://piapi.ai/docs/qwen-image-api/text-to-image.md
  { name: 'qwen-image', type: 'image', model: 'Qubico/qwen-image', taskType: 'txt2img', provider: 'Qwen', verified: true },

  // docs: https://piapi.ai/docs/seedream-api/seedream-5-lite.md
  { name: 'seedream-5-lite', type: 'image', model: 'seedream', taskType: 'seedream-5-lite', provider: 'Seedream', verified: true },

  // ========== video ==========
  // docs: https://piapi.ai/docs/sora2-api/text-to-video.md
  { name: 'sora2', type: 'video', model: 'sora2', taskType: 'sora2-video', provider: 'Sora', asyncOnly: true, verified: true },
  // docs: https://piapi.ai/docs/sora2-pro-api/text-to-video.md
  { name: 'sora2-pro', type: 'video', model: 'sora2', taskType: 'sora2-pro-video', provider: 'Sora', asyncOnly: true, verified: true },

  // docs: https://piapi.ai/docs/veo3-api/text-to-video.md
  { name: 'veo3', type: 'video', model: 'veo3', taskType: 'veo3-video', provider: 'Veo', asyncOnly: true, verified: true },
  // docs: https://piapi.ai/docs/veo31-api/text-to-video.md
  { name: 'veo3.1', type: 'video', model: 'veo3.1', taskType: 'veo3.1-video', provider: 'Veo', asyncOnly: true, verified: true },

  // docs: https://piapi.ai/docs/kling-api/kling-3-api.md
  { name: 'kling-3', type: 'video', model: 'kling', taskType: 'video_generation', provider: 'Kling', asyncOnly: true, defaultInput: { version: '3.0' }, verified: true },
  // docs: https://piapi.ai/docs/kling-api/kling-3-omni-api.md
  { name: 'kling-3-omni', type: 'video', model: 'kling', taskType: 'omni_video_generation', provider: 'Kling', asyncOnly: true, defaultInput: { version: '3.0' }, verified: true },
  // docs: https://piapi.ai/docs/kling-api/kling-o1-api.md
  { name: 'kling-o1', type: 'video', model: 'kling', taskType: 'omni_video_generation', provider: 'Kling', asyncOnly: true, defaultInput: { version: 'o1' }, verified: true },

  // docs: https://piapi.ai/docs/hailuo-api/generate-video.md
  { name: 'hailuo', type: 'video', model: 'hailuo', taskType: 'video_generation', provider: 'Hailuo', asyncOnly: true, defaultInput: { model: 'v2.3' }, verified: true },

  // docs: https://piapi.ai/docs/wan-api/wan26-text-to-video.md
  { name: 'wan2.6', type: 'video', model: 'Wan', taskType: 'wan26-txt2video', provider: 'Wan', asyncOnly: true, verified: true },

  // docs: https://piapi.ai/docs/seedance-api/seedance-2.md
  { name: 'seedance-2', type: 'video', model: 'seedance', taskType: 'seedance-2', provider: 'Seedance', asyncOnly: true, defaultInput: { mode: 'text_to_video' }, verified: true },

  // ========== audio ==========
  // docs: https://piapi.ai/docs/music-api/create-task.md
  { name: 'udio-music', type: 'audio', model: 'music-u', taskType: 'generate_music', provider: 'Udio', verified: true },
  // docs: https://piapi.ai/docs/ace-step-api/text-to-audio.md
  { name: 'ace-step', type: 'audio', model: 'Qubico/ace-step', taskType: 'txt2audio', provider: 'AceStep', verified: true },
  // docs: https://piapi.ai/docs/mmaudio-api/create-task.md
  { name: 'mmaudio', type: 'audio', model: 'Qubico/mmaudio', taskType: 'video2audio', provider: 'MMAudio', verified: true },
  // docs: https://piapi.ai/docs/diffrhythm-api/create-task.md
  { name: 'diffrhythm', type: 'audio', model: 'Qubico/diffrhythm', taskType: 'txt2audio-base', provider: 'DiffRhythm', verified: true },
  // docs: https://piapi.ai/docs/tts-api/f5-tts.md
  { name: 'f5-tts', type: 'audio', model: 'Qubico/tts', taskType: 'zero-shot', provider: 'F5TTS', verified: true },

  // ========== 3d ==========
  // docs: https://piapi.ai/docs/trellis-api/create-task.md
  { name: 'trellis', type: '3d', model: 'Qubico/trellis', taskType: 'text-to-3d', provider: 'Trellis', asyncOnly: true, verified: true },
  // docs: https://piapi.ai/docs/trellis2-api/create-task.md
  { name: 'trellis2', type: '3d', model: 'Qubico/trellis2', taskType: 'image-to-3d', provider: 'Trellis', asyncOnly: true, verified: true },

  // ========== OpenAI-compat: GPT image ==========
  // docs: https://piapi.ai/docs/gpt-image/gpt-image-api.md
  { name: 'gpt-image-2', type: 'image', model: 'gpt-image-2-preview', provider: 'OpenAI', apiType: 'openai-images', verified: true },
  { name: 'gpt-image-1.5', type: 'image', model: 'gpt-image-1.5', provider: 'OpenAI', apiType: 'openai-images', verified: true },
  { name: 'gpt-image-1', type: 'image', model: 'gpt-image-1', provider: 'OpenAI', apiType: 'openai-images', verified: true },

  // ========== OpenAI-compat: LLM completions ==========
  // docs: https://piapi.ai/docs/llm-api/completions.md
  { name: 'gpt-5', type: 'llm', model: 'gpt-5', provider: 'OpenAI', apiType: 'openai-completions', verified: true },
  { name: 'gpt-5.2', type: 'llm', model: 'gpt-5.2', provider: 'OpenAI', apiType: 'openai-completions', verified: true },
  { name: 'gpt-4o', type: 'llm', model: 'gpt-4o', provider: 'OpenAI', apiType: 'openai-completions', verified: true },
  { name: 'gpt-4o-mini', type: 'llm', model: 'gpt-4o-mini', provider: 'OpenAI', apiType: 'openai-completions', verified: true },
  { name: 'gpt-4.1', type: 'llm', model: 'gpt-4.1', provider: 'OpenAI', apiType: 'openai-completions', verified: true },
  { name: 'claude-opus-4.6', type: 'llm', model: 'claude-opus-4-6', provider: 'Anthropic', apiType: 'openai-completions', verified: true },
  { name: 'claude-sonnet-4.6', type: 'llm', model: 'claude-sonnet-4-6', provider: 'Anthropic', apiType: 'openai-completions', verified: true },
  { name: 'gemini-2.5-flash', type: 'llm', model: 'gemini-2.5-flash-nothinking', provider: 'Google', apiType: 'openai-completions', verified: true },
];

export function getModel(name: string): ModelEntry | undefined {
  return MODELS.find(m => m.name === name);
}

export function getModelsByType(type: ModelType): ModelEntry[] {
  return MODELS.filter(m => m.type === type);
}
