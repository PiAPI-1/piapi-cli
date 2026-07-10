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

import { closest } from '../suggest';

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
  streamingOnly?: boolean;  // openai-completions only — force stream=true (sora2-preview)
  defaultInput?: Record<string, unknown>;  // merged into request input/body (user values win)
  verified?: boolean;    // true = real `model` string verified against piapi docs
}

export const MODELS: ModelEntry[] = [
  // ========== image ==========
  // docs: https://piapi.ai/docs/flux-api/text-to-image.md
  { name: 'flux-dev', type: 'image', model: 'Qubico/flux1-dev', taskType: 'txt2img', provider: 'Flux', verified: true },
  { name: 'flux-schnell', type: 'image', model: 'Qubico/flux1-schnell', taskType: 'txt2img', provider: 'Flux', verified: true },
  { name: 'flux-dev-advanced', type: 'image', model: 'Qubico/flux1-dev-advanced', taskType: 'txt2img', provider: 'Flux', verified: true },

  // ========== flux variants ==========
  // docs: https://piapi.ai/docs/flux-api/image-to-image.md
  { name: 'flux-img2img', type: 'image', model: 'Qubico/flux1-schnell', taskType: 'img2img', provider: 'Flux', verified: true },
  // docs: https://piapi.ai/docs/flux-api/kontext.md
  { name: 'flux-kontext', type: 'image', model: 'Qubico/flux1-dev-advanced', taskType: 'kontext', provider: 'Flux', verified: true },
  // docs: https://piapi.ai/docs/flux-redux-fill-variation-inpaint-outpaint.md
  { name: 'flux-inpaint', type: 'image', model: 'Qubico/flux1-dev-advanced', taskType: 'fill-inpaint', provider: 'Flux', verified: true },
  // docs: https://piapi.ai/docs/flux-redux-fill-variation-inpaint-outpaint.md
  { name: 'flux-outpaint', type: 'image', model: 'Qubico/flux1-dev-advanced', taskType: 'fill-outpaint', provider: 'Flux', verified: true },
  // docs: https://piapi.ai/docs/flux-redux-fill-variation-inpaint-outpaint.md
  { name: 'flux-redux', type: 'image', model: 'Qubico/flux1-dev-advanced', taskType: 'redux-variation', provider: 'Flux', verified: true },

  // docs: https://piapi.ai/docs/midjourney-api/imagine.md
  { name: 'midjourney', type: 'image', model: 'midjourney', taskType: 'imagine', provider: 'Midjourney', verified: true },

  // ========== midjourney variants ==========
  // docs: https://piapi.ai/docs/midjourney-api/upscale.md
  { name: 'mj-upscale', type: 'image', model: 'midjourney', taskType: 'upscale', provider: 'Midjourney', asyncOnly: true, verified: true },
  // docs: https://piapi.ai/docs/midjourney-api/variation.md
  { name: 'mj-variation', type: 'image', model: 'midjourney', taskType: 'variation', provider: 'Midjourney', asyncOnly: true, verified: true },
  // docs: https://piapi.ai/docs/midjourney-api/reroll.md
  { name: 'mj-reroll', type: 'image', model: 'midjourney', taskType: 'reroll', provider: 'Midjourney', asyncOnly: true, verified: true },
  // docs: https://piapi.ai/docs/midjourney-api/describe.md
  { name: 'mj-describe', type: 'image', model: 'midjourney', taskType: 'describe', provider: 'Midjourney', asyncOnly: true, verified: true },
  // docs: https://piapi.ai/docs/midjourney-api/seed.md
  { name: 'mj-seed', type: 'image', model: 'midjourney', taskType: 'seed', provider: 'Midjourney', asyncOnly: true, verified: true },
  // docs: https://piapi.ai/docs/midjourney-api/blend.md
  { name: 'mj-blend', type: 'image', model: 'midjourney', taskType: 'blend', provider: 'Midjourney', asyncOnly: true, verified: true },
  // docs: https://piapi.ai/docs/midjourney-api/inpaint.md
  { name: 'mj-inpaint', type: 'image', model: 'midjourney', taskType: 'inpaint', provider: 'Midjourney', asyncOnly: true, verified: true },
  // docs: https://piapi.ai/docs/midjourney-api/outpaint.md
  { name: 'mj-outpaint', type: 'image', model: 'midjourney', taskType: 'outpaint', provider: 'Midjourney', asyncOnly: true, verified: true },
  // docs: https://piapi.ai/docs/midjourney-api/pan.md
  { name: 'mj-pan', type: 'image', model: 'midjourney', taskType: 'pan', provider: 'Midjourney', asyncOnly: true, verified: true },

  // docs: https://piapi.ai/docs/gemini-api/nano-banana-pro.md
  { name: 'nano-banana-pro', type: 'image', model: 'gemini', taskType: 'nano-banana-pro', provider: 'Gemini', verified: true },
  // docs: https://piapi.ai/docs/gemini-api/nano-banana-2.md
  { name: 'nano-banana-2', type: 'image', model: 'gemini', taskType: 'nano-banana-2', provider: 'Gemini', verified: true },
  // docs: https://piapi.ai/docs/gemini-api/gemini-25-flash-image.md
  { name: 'gemini-2.5-flash-image', type: 'image', model: 'gemini', taskType: 'gemini-2.5-flash-image', provider: 'Gemini', verified: true },

  // docs: https://piapi.ai/docs/qwen-image-api/text-to-image.md
  { name: 'qwen-image', type: 'image', model: 'Qubico/qwen-image', taskType: 'txt2img', provider: 'Qwen', verified: true },
  // docs: https://piapi.ai/docs/qwen-image-api/image-edit.md
  { name: 'qwen-image-edit', type: 'image', model: 'Qubico/qwen-image', taskType: 'image-edit', provider: 'Qwen', verified: true },

  // docs: https://piapi.ai/docs/z-image-api/text-to-image.md
  { name: 'z-image', type: 'image', model: 'Qubico/z-image', taskType: 'txt2img', provider: 'ZImage', verified: true },

  // docs: https://piapi.ai/docs/seedream-api/seedream-5.md
  { name: 'seedream-5-lite', type: 'image', model: 'seedream', taskType: 'seedream-5-lite', provider: 'Seedream', verified: true },
  // Pro sizes are 1K (default) / 2K; multi-image input fields are ignored here.
  // docs: https://piapi.ai/docs/seedream-api/seedream-5.md
  { name: 'seedream-5-pro', type: 'image', model: 'seedream', taskType: 'seedream-5-pro', provider: 'Seedream', verified: true },
  // Less-restriction variants: same engine and input schema, more permissive
  // content review, +25% price, no retry on content rejection.
  // docs: https://piapi.ai/docs/seedance-api/less-restriction.md
  { name: 'seedream-5-lite-less-restriction', type: 'image', model: 'seedream', taskType: 'seedream-5-lite-less-restriction', provider: 'Seedream', verified: true },
  // docs: https://piapi.ai/docs/seedance-api/less-restriction.md
  { name: 'seedream-5-pro-less-restriction', type: 'image', model: 'seedream', taskType: 'seedream-5-pro-less-restriction', provider: 'Seedream', verified: true },

  // ========== image tools ==========
  // docs: https://piapi.ai/docs/image-editing-api/remove-background-api.md
  { name: 'remove-bg', type: 'image', model: 'Qubico/image-toolkit', taskType: 'background-remove', provider: 'ImageToolkit', verified: true },
  // docs: https://piapi.ai/docs/image-editing-api/super-resolution-api.md
  { name: 'upscale', type: 'image', model: 'Qubico/image-toolkit', taskType: 'upscale', provider: 'ImageToolkit', verified: true },
  // docs: https://piapi.ai/docs/image-editing-api/segment-with-prompt-api.md
  { name: 'segment', type: 'image', model: 'Qubico/image-toolkit', taskType: 'segment', provider: 'ImageToolkit', verified: true },
  // docs: https://piapi.ai/docs/joycaption-api/create-task.md
  { name: 'joycaption', type: 'image', model: 'Qubico/joycaption', taskType: 'joycaption-beta-one', provider: 'JoyCaption', verified: true },

  // ========== faceswap (image) ==========
  // docs: https://piapi.ai/docs/faceswap-api/create-task.md
  { name: 'faceswap', type: 'image', model: 'Qubico/image-toolkit', taskType: 'face-swap', provider: 'Faceswap', asyncOnly: true, verified: true },
  // docs: https://piapi.ai/docs/multi-face-swap/create-task.md
  { name: 'multi-faceswap', type: 'image', model: 'Qubico/image-toolkit', taskType: 'multi-face-swap', provider: 'Faceswap', asyncOnly: true, verified: true },

  // ========== video ==========
  // docs: https://piapi.ai/docs/sora2-api/text-to-video.md
  { name: 'sora2', type: 'video', model: 'sora2', taskType: 'sora2-video', provider: 'Sora', asyncOnly: true, verified: true },
  // docs: https://piapi.ai/docs/sora2-api/remove-watermark.md
  { name: 'sora2-watermark', type: 'video', model: 'sora2', taskType: 'remove-watermark', provider: 'Sora', asyncOnly: true, verified: true },
  // docs: https://piapi.ai/docs/sora2-pro-api/text-to-video.md
  { name: 'sora2-pro', type: 'video', model: 'sora2', taskType: 'sora2-pro-video', provider: 'Sora', asyncOnly: true, verified: true },

  // docs: https://piapi.ai/docs/veo3-api/text-to-video.md
  { name: 'veo3', type: 'video', model: 'veo3', taskType: 'veo3-video', provider: 'Veo', asyncOnly: true, verified: true },
  // veo3-video-fast is the faster/cheaper speed tier of veo3 (works for both
  // text-to-video and image-to-video — pass image_url in input for i2v).
  // docs: https://piapi.ai/docs/veo3-api/image-to-video.md
  { name: 'veo3-fast', type: 'video', model: 'veo3', taskType: 'veo3-video-fast', provider: 'Veo', asyncOnly: true, verified: true },
  // docs: https://piapi.ai/docs/veo31-api/text-to-video.md
  { name: 'veo3.1', type: 'video', model: 'veo3.1', taskType: 'veo3.1-video', provider: 'Veo', asyncOnly: true, verified: true },
  // veo3.1-video-fast is the faster/cheaper speed tier (t2v + i2v).
  // docs: https://piapi.ai/docs/veo31-api/image-to-video.md
  { name: 'veo3.1-fast', type: 'video', model: 'veo3.1', taskType: 'veo3.1-video-fast', provider: 'Veo', asyncOnly: true, verified: true },

  // docs: https://piapi.ai/docs/kling-api/kling-3-api.md
  { name: 'kling-3', type: 'video', model: 'kling', taskType: 'video_generation', provider: 'Kling', asyncOnly: true, defaultInput: { version: '3.0' }, verified: true },
  // docs: https://piapi.ai/docs/kling-api/kling-3-omni-api.md
  { name: 'kling-3-omni', type: 'video', model: 'kling', taskType: 'omni_video_generation', provider: 'Kling', asyncOnly: true, defaultInput: { version: '3.0' }, verified: true },
  // docs: https://piapi.ai/docs/kling-api/kling-o1-api.md
  { name: 'kling-o1', type: 'video', model: 'kling', taskType: 'omni_video_generation', provider: 'Kling', asyncOnly: true, defaultInput: { version: 'o1' }, verified: true },
  // docs: https://piapi.ai/docs/kling-api/virtual-try-on-api.md
  { name: 'kling-tryon', type: 'video', model: 'kling', taskType: 'ai_try_on', provider: 'Kling', asyncOnly: true, defaultInput: { version: '2.6' }, verified: true },
  // docs: https://piapi.ai/docs/kling-api/kling-effects-api.md
  { name: 'kling-effects', type: 'video', model: 'kling', taskType: 'effects', provider: 'Kling', asyncOnly: true, defaultInput: { version: '2.6' }, verified: true },
  // docs: https://piapi.ai/docs/kling-api/kling-sound-api.md
  { name: 'kling-sound', type: 'video', model: 'kling', taskType: 'sound', provider: 'Kling', asyncOnly: true, defaultInput: { version: '2.6' }, verified: true },
  // docs: https://piapi.ai/docs/kling-api/kling-avatar-api.md
  { name: 'kling-avatar', type: 'video', model: 'kling', taskType: 'avatar', provider: 'Kling', asyncOnly: true, defaultInput: { version: '2.6' }, verified: true },
  // docs: https://piapi.ai/docs/kling-api/kling-motion-control-api.md
  { name: 'kling-motion', type: 'video', model: 'kling', taskType: 'motion_control', provider: 'Kling', asyncOnly: true, defaultInput: { version: '2.6' }, verified: true },
  // docs: https://piapi.ai/docs/kling-api/kling-turbo-api.md
  { name: 'kling-turbo', type: 'video', model: 'kling-turbo', taskType: 'video_generation', provider: 'Kling', asyncOnly: true, verified: true },
  // docs: https://piapi.ai/docs/kling-api/kling-elements.md
  { name: 'kling-elements', type: 'video', model: 'kling', taskType: 'video_generation', provider: 'Kling', asyncOnly: true, defaultInput: { version: '1.6' }, verified: true },

  // docs: https://piapi.ai/docs/hailuo-api/generate-video.md
  { name: 'hailuo', type: 'video', model: 'hailuo', taskType: 'video_generation', provider: 'Hailuo', asyncOnly: true, defaultInput: { model: 'v2.3' }, verified: true },

  // docs: https://piapi.ai/docs/skyreels-api/create-task.md
  { name: 'skyreels', type: 'video', model: 'Qubico/skyreels', taskType: 'img2video', provider: 'Skyreels', asyncOnly: true, verified: true },
  // docs: https://piapi.ai/docs/framepack-api/create-task.md
  { name: 'framepack', type: 'video', model: 'Qubico/framepack', taskType: 'img2video', provider: 'Framepack', asyncOnly: true, verified: true },
  // docs: https://piapi.ai/docs/hunyuan-video/txt2video-api.md
  { name: 'hunyuan-video', type: 'video', model: 'Qubico/hunyuan', taskType: 'txt2video', provider: 'Hunyuan', asyncOnly: true, verified: true },
  // docs: https://piapi.ai/docs/dream-machine/create-task.md
  { name: 'luma', type: 'video', model: 'luma', taskType: 'video_generation', provider: 'Luma', asyncOnly: true, verified: true },
  // docs: https://piapi.ai/docs/omni-human-api/omni-human-1-5.md
  { name: 'omni-human', type: 'video', model: 'omni-human', taskType: 'omni-human-1.5', provider: 'OmniHuman', asyncOnly: true, verified: true },
  // docs: https://piapi.ai/docs/ai-hug-api/create-task.md
  { name: 'ai-hug-video', type: 'video', model: 'Qubico/hug-video', taskType: 'image_to_video', provider: 'AiHug', asyncOnly: true, verified: true },

  // docs: https://piapi.ai/docs/wan-api/wan26-text-to-video.md
  { name: 'wan2.6', type: 'video', model: 'Wan', taskType: 'wan26-txt2video', provider: 'Wan', asyncOnly: true, verified: true },
  // docs: https://piapi.ai/docs/wan-api/wan26-image-to-video.md
  { name: 'wan2.6-img2vid', type: 'video', model: 'Wan', taskType: 'wan26-img2video', provider: 'Wan', asyncOnly: true, verified: true },

  // docs: https://piapi.ai/docs/wanx-api/create-task.md
  { name: 'wanx-lora', type: 'video', model: 'Qubico/wanx', taskType: 'txt2video-14b-lora', provider: 'Wan', asyncOnly: true, verified: true },
  // docs: https://piapi.ai/docs/wanx-api/create-task.md
  { name: 'wanx-lora-img2vid', type: 'video', model: 'Qubico/wanx', taskType: 'img2video-14b-lora', provider: 'Wan', asyncOnly: true, verified: true },
  // docs: https://piapi.ai/docs/wanx-api/create-task.md
  { name: 'wanx-keyframe', type: 'video', model: 'Qubico/wanx', taskType: 'img2video-14b-keyframe', provider: 'Wan', asyncOnly: true, verified: true },
  // docs: https://piapi.ai/docs/wanx-api/create-task.md
  { name: 'wanx-camera', type: 'video', model: 'Qubico/wanx', taskType: 'img2video-14b-control-camera', provider: 'Wan', asyncOnly: true, verified: true },
  // docs: https://piapi.ai/docs/wanx-api/create-task.md
  { name: 'wanx22', type: 'video', model: 'Qubico/wanx', taskType: 'wan22-txt2video-14b', provider: 'Wan', asyncOnly: true, verified: true },
  // docs: https://piapi.ai/docs/wanx-api/create-task.md
  { name: 'wanx22-img2vid', type: 'video', model: 'Qubico/wanx', taskType: 'wan22-img2video-14b', provider: 'Wan', asyncOnly: true, verified: true },

  // `mode` is optional and auto-inferred from the references passed (text /
  // first_last_frames / omni_reference) — do NOT default it, or image/video
  // reference workflows break against the strict mode validation.
  // docs: https://piapi.ai/docs/seedance-api/seedance-2.md
  { name: 'seedance-2', type: 'video', model: 'seedance', taskType: 'seedance-2', provider: 'Seedance', asyncOnly: true, verified: true },
  { name: 'seedance-2-fast', type: 'video', model: 'seedance', taskType: 'seedance-2-fast', provider: 'Seedance', asyncOnly: true, verified: true },
  // Less-restriction variants: same engine and input schema, more permissive
  // content review, +25% price, no retry on content rejection. Fast tiers cap
  // at 720p.
  // docs: https://piapi.ai/docs/seedance-api/less-restriction.md
  { name: 'seedance-2-less-restriction', type: 'video', model: 'seedance', taskType: 'seedance-2-less-restriction', provider: 'Seedance', asyncOnly: true, verified: true },
  { name: 'seedance-2-fast-less-restriction', type: 'video', model: 'seedance', taskType: 'seedance-2-fast-less-restriction', provider: 'Seedance', asyncOnly: true, verified: true },
  // docs: https://piapi.ai/docs/seedance-api/video-watermark-remover.md
  { name: 'seedance-watermark', type: 'video', model: 'seedance', taskType: 'remove-watermark', provider: 'Seedance', asyncOnly: true, verified: true },

  // ========== video tools ==========
  // docs: https://piapi.ai/docs/tools/video-upscale-api.md
  { name: 'video-upscale', type: 'video', model: 'Qubico/video-toolkit', taskType: 'upscale', provider: 'VideoToolkit', asyncOnly: true, verified: true },
  // docs: https://piapi.ai/docs/tools/video-remove-background-api.md
  { name: 'video-remove-bg', type: 'video', model: 'Qubico/video-toolkit', taskType: 'background-remove', provider: 'VideoToolkit', asyncOnly: true, verified: true },
  // docs: https://piapi.ai/docs/faceswap-api/video-faceswap.md
  { name: 'video-faceswap', type: 'video', model: 'Qubico/video-toolkit', taskType: 'face-swap', provider: 'Faceswap', asyncOnly: true, verified: true },

  // ========== audio ==========
  // docs: https://piapi.ai/docs/music-api/create-task.md
  { name: 'udio-music', type: 'audio', model: 'music-u', taskType: 'generate_music', provider: 'Udio', verified: true },
  // docs: https://piapi.ai/docs/song-api/udio-song-extend.md
  { name: 'udio-song-extend', type: 'audio', model: 'music-u', taskType: 'generate_music', provider: 'Udio', verified: true },
  // docs: https://piapi.ai/docs/song-api/udio-generate-lyrics.md
  { name: 'udio-lyrics', type: 'audio', model: 'music-u', taskType: 'generate_lyrics', provider: 'Udio', verified: true },
  // docs: https://piapi.ai/docs/ace-step-api/text-to-audio.md
  { name: 'ace-step', type: 'audio', model: 'Qubico/ace-step', taskType: 'txt2audio', provider: 'AceStep', verified: true },
  // docs: https://piapi.ai/docs/ace-step-api/audio-to-audio.md
  { name: 'ace-step-audio2audio', type: 'audio', model: 'Qubico/ace-step', taskType: 'audio2audio', provider: 'AceStep', verified: true },
  // docs: https://piapi.ai/docs/ace-step-api/audio-edit.md
  { name: 'ace-step-edit', type: 'audio', model: 'Qubico/ace-step', taskType: 'edit', provider: 'AceStep', verified: true },
  // docs: https://piapi.ai/docs/ace-step-api/audio-extend.md
  { name: 'ace-step-extend', type: 'audio', model: 'Qubico/ace-step', taskType: 'extend', provider: 'AceStep', verified: true },
  // docs: https://piapi.ai/docs/mmaudio-api/create-task.md
  { name: 'mmaudio', type: 'audio', model: 'Qubico/mmaudio', taskType: 'video2audio', provider: 'MMAudio', verified: true },
  // docs: https://piapi.ai/docs/diffrhythm-api/create-task.md
  { name: 'diffrhythm', type: 'audio', model: 'Qubico/diffrhythm', taskType: 'txt2audio-base', provider: 'DiffRhythm', verified: true },
  // docs: https://piapi.ai/docs/tts-api/f5-tts.md
  { name: 'f5-tts', type: 'audio', model: 'Qubico/tts', taskType: 'zero-shot', provider: 'F5TTS', verified: true },
  // docs: https://piapi.ai/docs/byteaudio-api/seed-audio.md
  { name: 'seed-audio', type: 'audio', model: 'byteaudio', taskType: 'seed-audio-1.0', provider: 'ByteAudio', verified: true },

  // ========== 3d ==========
  // docs: https://piapi.ai/docs/trellis-api/create-task.md
  { name: 'trellis', type: '3d', model: 'Qubico/trellis', taskType: 'text-to-3d', provider: 'Trellis', asyncOnly: true, verified: true },
  // docs: https://piapi.ai/docs/trellis2-api/create-task.md
  { name: 'trellis2', type: '3d', model: 'Qubico/trellis2', taskType: 'image-to-3d', provider: 'Trellis', asyncOnly: true, verified: true },
  // docs: https://piapi.ai/docs/pixal-3d-api/create-task.md
  { name: 'pixal3d', type: '3d', model: 'Qubico/pixal3d', taskType: 'image-to-3d', provider: 'Pixal3D', asyncOnly: true, verified: true },

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
  { name: 'gemini-2.5-flash-nothinking', type: 'llm', model: 'gemini-2.5-flash-nothinking', provider: 'Google', apiType: 'openai-completions', verified: true },

  // ========== OpenAI-compat: Sora2 streaming ==========
  // PiAPI wraps sora2 video generation as a streamed chat completion;
  // the assistant content is markdown that includes the final video URL.
  // docs: https://piapi.ai/docs/sora2-preview-api/text-to-video.md
  { name: 'sora2-preview', type: 'video', model: 'sora-2-preview', provider: 'Sora', apiType: 'openai-completions', streamingOnly: true, verified: true },
  { name: 'sora2-hd-preview', type: 'video', model: 'sora-2-hd-preview', provider: 'Sora', apiType: 'openai-completions', streamingOnly: true, verified: true },
];

export function getModel(name: string): ModelEntry | undefined {
  return MODELS.find(m => m.name === name);
}

// "Unknown model: flux-dv" with 94 entries is almost always a typo —
// build the standard error with a closest-name suggestion attached.
export function unknownModelError(name: string): { message: string; hint: string } {
  const suggestion = closest(name, MODELS.map(m => m.name));
  return {
    message: `Unknown model: ${name}`,
    hint: suggestion
      ? `Did you mean "${suggestion}"? Run "piapi model list" for available models.`
      : `Run "piapi model list" for available models.`,
  };
}

export function getModelsByType(type: ModelType): ModelEntry[] {
  return MODELS.filter(m => m.type === type);
}
