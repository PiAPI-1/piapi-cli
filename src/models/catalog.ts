// Sources (verified against live docs):
// image: https://piapi.ai/docs/flux-api/text-to-image.md
// video: https://piapi.ai/docs/sora2-api/text-to-video.md, https://piapi.ai/docs/kling-api/kling-3-api.md, etc.
// audio: https://piapi.ai/docs/music-api/create-task.md, https://piapi.ai/docs/tts-api/f5-tts.md, etc.
// 3d: https://piapi.ai/docs/trellis-api/create-task.md
// llm: https://piapi.ai/docs/llm-api/completions.md (separate /v1/chat/completions endpoint — excluded)

export type ModelType = 'image' | 'video' | 'audio' | '3d' | 'llm';

export interface ModelEntry {
  name: string;
  type: ModelType;
  taskType: string;
  provider: string;
  asyncOnly?: boolean;
}

export const MODELS: ModelEntry[] = [
  // image
  // docs: https://piapi.ai/docs/flux-api/text-to-image.md
  { name: 'flux-dev', type: 'image', taskType: 'txt2img', provider: 'Flux' },
  { name: 'flux-schnell', type: 'image', taskType: 'txt2img', provider: 'Flux' },
  { name: 'flux-pro', type: 'image', taskType: 'txt2img', provider: 'Flux' },
  // docs: https://piapi.ai/docs/midjourney-api/imagine.md
  { name: 'midjourney', type: 'image', taskType: 'imagine', provider: 'Midjourney' },
  // docs: https://piapi.ai/docs/gemini-api/nano-banana-pro.md
  { name: 'nano-banana-pro', type: 'image', taskType: 'nano-banana-pro', provider: 'Gemini' },
  // docs: https://piapi.ai/docs/gemini-api/nano-banana-2.md
  { name: 'nano-banana-2', type: 'image', taskType: 'nano-banana-2', provider: 'Gemini' },
  // docs: https://piapi.ai/docs/gemini-api/gemini-25-flash-image.md
  { name: 'gemini-2.5-flash-image', type: 'image', taskType: 'gemini-2.5-flash-image', provider: 'Gemini' },
  // docs: https://piapi.ai/docs/qwen-image-api/text-to-image.md
  { name: 'qwen-image', type: 'image', taskType: 'txt2img', provider: 'Qwen' },
  // docs: https://piapi.ai/docs/seedream-api/seedream-5-lite.md
  { name: 'seedream-5-lite', type: 'image', taskType: 'seedream-5-lite', provider: 'Seedream' },
  // gpt-image uses /v1/images/generations not unified API — excluded from v1 catalog

  // video
  // docs: https://piapi.ai/docs/sora2-api/text-to-video.md
  { name: 'sora2', type: 'video', taskType: 'sora2-video', provider: 'Sora', asyncOnly: true },
  // docs: https://piapi.ai/docs/sora2-pro-api/text-to-video.md
  { name: 'sora2-pro', type: 'video', taskType: 'sora2-pro-video', provider: 'Sora', asyncOnly: true },
  // docs: https://piapi.ai/docs/veo3-api/text-to-video.md
  { name: 'veo3', type: 'video', taskType: 'veo3-video', provider: 'Veo', asyncOnly: true },
  // docs: https://piapi.ai/docs/veo31-api/text-to-video.md
  { name: 'veo3.1', type: 'video', taskType: 'veo3.1-video', provider: 'Veo', asyncOnly: true },
  // docs: https://piapi.ai/docs/kling-api/kling-3-api.md
  { name: 'kling-3', type: 'video', taskType: 'video_generation', provider: 'Kling', asyncOnly: true },
  // docs: https://piapi.ai/docs/kling-api/kling-3-omni-api.md
  { name: 'kling-3-omni', type: 'video', taskType: 'omni_video_generation', provider: 'Kling', asyncOnly: true },
  // docs: https://piapi.ai/docs/kling-api/kling-o1-api.md
  { name: 'kling-o1', type: 'video', taskType: 'omni_video_generation', provider: 'Kling', asyncOnly: true },
  // docs: https://piapi.ai/docs/hailuo-api/generate-video.md
  { name: 'hailuo', type: 'video', taskType: 'video_generation', provider: 'Hailuo', asyncOnly: true },
  // docs: https://piapi.ai/docs/wan-api/wan26-text-to-video.md
  { name: 'wan2.6', type: 'video', taskType: 'wan26-txt2video', provider: 'Wan', asyncOnly: true },
  // docs: https://piapi.ai/docs/seedance-api/seedance-2.md
  { name: 'seedance-2', type: 'video', taskType: 'seedance-2', provider: 'Seedance', asyncOnly: true },

  // audio
  // docs: https://piapi.ai/docs/music-api/create-task.md
  { name: 'udio-music', type: 'audio', taskType: 'generate_music', provider: 'Udio' },
  // docs: https://piapi.ai/docs/ace-step-api/text-to-audio.md
  { name: 'ace-step', type: 'audio', taskType: 'txt2audio', provider: 'AceStep' },
  // docs: https://piapi.ai/docs/mmaudio-api/create-task.md
  { name: 'mmaudio', type: 'audio', taskType: 'video2audio', provider: 'MMAudio' },
  // docs: https://piapi.ai/docs/diffrhythm-api/create-task.md
  { name: 'diffrhythm', type: 'audio', taskType: 'txt2audio-base', provider: 'DiffRhythm' },
  // docs: https://piapi.ai/docs/tts-api/f5-tts.md
  { name: 'f5-tts', type: 'audio', taskType: 'zero-shot', provider: 'F5TTS' },

  // 3d
  // docs: https://piapi.ai/docs/trellis-api/create-task.md
  { name: 'trellis', type: '3d', taskType: 'text-to-3d', provider: 'Trellis', asyncOnly: true },
  // docs: https://piapi.ai/docs/trellis2-api/create-task.md
  { name: 'trellis2', type: '3d', taskType: 'image-to-3d', provider: 'Trellis', asyncOnly: true },
];

export function getModel(name: string): ModelEntry | undefined {
  return MODELS.find(m => m.name === name);
}

export function getModelsByType(type: ModelType): ModelEntry[] {
  return MODELS.filter(m => m.type === type);
}
