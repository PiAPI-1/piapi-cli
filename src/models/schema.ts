import { getModel } from './catalog';

export function getModelSchema(modelName: string): Record<string, unknown> | null {
  const model = getModel(modelName);
  if (!model) return null;

  // Static schema per model — keyed by model name, not taskType
  const schemas: Record<string, Record<string, unknown>> = {
    'flux-dev': {
      prompt: { type: 'string', required: true, description: 'Text prompt' },
      aspect_ratio: { type: 'string', default: '1:1', description: 'Aspect ratio: 1:1, 16:9, 9:16, 4:3, 3:4' },
      num_outputs: { type: 'number', default: 1, description: 'Number of images to generate' },
      num_inference_steps: { type: 'number', default: 25, description: 'Inference steps' },
      guidance_scale: { type: 'number', default: 7.5, description: 'Guidance scale' },
    },
    'flux-schnell': {
      prompt: { type: 'string', required: true, description: 'Text prompt' },
      aspect_ratio: { type: 'string', default: '1:1', description: 'Aspect ratio: 1:1, 16:9, 9:16, 4:3, 3:4' },
      num_outputs: { type: 'number', default: 1, description: 'Number of images to generate' },
      num_inference_steps: { type: 'number', default: 25, description: 'Inference steps' },
      guidance_scale: { type: 'number', default: 7.5, description: 'Guidance scale' },
    },
    'kling-3': {
      prompt: { type: 'string', required: true, description: 'Text prompt' },
      duration: { type: 'string', default: '5' },
      aspect_ratio: { type: 'string', default: '16:9' },
    },
    'sora2': {
      prompt: { type: 'string', required: true, description: 'Text prompt' },
      duration: { type: 'string', default: '10' },
      aspect_ratio: { type: 'string', default: '16:9' },
    },
    'udio-music': {
      prompt: { type: 'string', required: true, description: 'Music description prompt' },
      duration: { type: 'string', default: '30' },
    },
    'trellis': {
      prompt: { type: 'string', required: true, description: '3D generation prompt' },
    },
  };

  // Descriptive fields only. Defaults here are not injected into requests.
  // docs: https://piapi.ai/docs/seedance-api/seedance-25.md
  const seedance25 = {
    prompt: { type: 'string', description: 'Required except for draft_task_id finalization; omit when finalizing a draft' },
    mode: { type: 'string', description: 'Optional generation mode, e.g. text_to_video or omni_reference; inferred when omitted' },
    duration: { type: 'number', default: 5, description: 'Integer 4-30 seconds; -1 for edit; omit for draft finalization' },
    resolution: { type: 'string', default: '720p', description: '480p, 720p or 1080p; draft requires 480p, draft_task_id requires 1080p; no 4K' },
    aspect_ratio: { type: 'string', default: '16:9', description: '16:9, 9:16, 4:3, 3:4, 21:9, 1:1 or adaptive; edit/extend require adaptive; omit for draft finalization' },
    image_urls: { type: 'array', description: 'Up to 30 reference image URLs; omit for draft finalization' },
    video_urls: { type: 'array', description: 'Up to 10 videos, total at most 30 seconds; required for edit/extend; omit for draft finalization' },
    audio_urls: { type: 'array', description: 'Up to 10 audio references, total at most 30 seconds; omit for draft finalization' },
    omni_reference_task_type: { type: 'string', default: 'auto', description: 'auto, reference, edit or extend; edit requires duration=-1 and a 4-30 second source; omit for draft finalization' },
    draft: { type: 'boolean', description: 'true creates a 480p draft; mutually exclusive with draft_task_id' },
    draft_task_id: { type: 'string', description: 'Completed draft from the same account/task type, valid for 7 days; send resolution=1080p and omit prompt/references/duration/aspect_ratio/seed/audio/omni_reference_task_type' },
    auto_upload_assets: { type: 'boolean', description: 'Set false for less-restriction video editing so the source URL remains directly readable' },
  };
  for (const name of ['seedance-2.5', 'seedance-2.5-less-restriction']) schemas[name] = seedance25;

  // docs: https://piapi.ai/docs/seedance-api/seedance-2.md
  const seedanceMini = {
    prompt: { type: 'string', required: true },
    mode: { type: 'string', description: 'Optional mode inferred from references; do not force text mode for reference workflows' },
    duration: { type: 'number', default: 5, description: 'Integer 4-15 seconds' },
    resolution: { type: 'string', default: '720p', description: '480p or 720p; Mini does not support 1080p' },
    aspect_ratio: { type: 'string', default: '16:9' },
    image_urls: { type: 'array', description: '1-2 images in first/last-frame mode, up to 9 in omni-reference mode' },
    video_urls: { type: 'array', description: 'Omni-reference only, up to 3 videos, total duration at most 15.4 seconds' },
    audio_urls: { type: 'array', description: 'Omni-reference only, up to 3 MP3/WAV references, total duration at most 15 seconds' },
  };
  for (const name of ['seedance-2-mini', 'seedance-2-mini-less-restriction']) schemas[name] = seedanceMini;

  // docs: https://piapi.ai/docs/minimax-api/generate-video.md
  const minimax = {
    prompt: { type: 'string', required: true, description: 'Up to 2000 characters' },
    duration: { type: 'number', default: 5, description: 'Integer 5-15 seconds' },
    aspect_ratio: { type: 'string', default: '16:9', description: '16:9, 9:16 or 1:1' },
    resolution: { type: 'string', description: 'Unresolved upstream conflict: prose says 480P/768P/1080P, schema says 512p/768p. No CLI default is injected' },
    seed: { type: 'number', description: 'Optional reproducibility seed' },
  };
  for (const name of ['minimax-h3', 'minimax-h3-nsfw']) schemas[name] = minimax;
  for (const name of ['minimax-h3-img2vid', 'minimax-h3-nsfw-img2vid']) {
    schemas[name] = {
      ...minimax,
      image: { type: 'string', required: true, description: 'First-frame public URL or base64 data URI' },
    };
  }

  // docs: https://piapi.ai/docs/meshy-api/create-task.md
  schemas.meshy = {
    image_url: { type: 'string', required: true, description: 'Reference image URL' },
    should_texture: { type: 'boolean', default: true },
    should_remesh: { type: 'boolean', default: true },
    texture_resolution: { type: 'string', description: '2k, 4k or 8k' },
  };
  schemas['meshy-txt'] = {
    mode: { type: 'string', required: true, description: 'preview creates geometry, refine textures a completed preview' },
    prompt: { type: 'string', description: 'Required for mode=preview' },
    preview_task_id: { type: 'string', description: 'Completed preview task ID, required for mode=refine' },
    art_style: { type: 'string', description: 'Optional preview style, e.g. realistic' },
    should_remesh: { type: 'boolean', default: true },
  };
  // docs: https://piapi.ai/docs/tools/skin-tokens-api.md
  schemas['skin-tokens'] = {
    model: { type: 'string', required: true, description: 'Input GLB URL or base64 data URI, valid glTF 2.0, at most 80000 triangles; not the outer API model identifier' },
    seed: { type: 'number', default: -1, description: '-1 selects a random seed' },
  };

  // --edit selects multipart inputs; --async selects the task submission gateway.
  // docs: https://piapi.ai/docs/gpt-image/gpt-image-api.md
  const image = {
    prompt: { type: 'string', required: true },
    image: { type: 'string or array', description: '--edit only: image=@file or image:=["@file1","@file2"], 1-16 local PNG/JPG/WEBP files, at most 25 MB each' },
    mask: { type: 'string', description: '--edit only: optional local mask=@file, applies to the first image' },
    size: { type: 'string', default: '1024x1024' },
    n: { type: 'number', default: 1 },
    response_format: { type: 'string', default: 'b64_json', description: 'b64_json or url; --download saves either response type' },
  };
  schemas['gpt-image-2-preview'] = image;
  schemas['gpt-image-2-ga'] = {
    ...image,
    quality: { type: 'string', default: 'medium', description: 'GA supports medium only; token-billed, unlike the preview compatibility alias' },
  };
  const image25 = {
    ...image,
    quality: { type: 'string', default: 'low', description: 'auto, low, medium or high; higher tiers change billed token usage' },
  };
  for (const name of ['gpt-image-2.5-flare', 'gpt-image-2.5-sunburst']) schemas[name] = image25;
  schemas['gpt-image-2.5'] = {
    ...image25,
    size: { type: 'string', description: 'Accepted but not honored; the budget route chooses its own output size' },
    quality: { type: 'string', description: 'auto, low, medium or high are accepted but not honored on the budget route' },
    n: { type: 'number', default: 1, description: 'Only n=1 is supported' },
  };

  // docs: https://piapi.ai/docs/llm-api/completions.md
  const chat = {
    prompt: { type: 'string', description: 'Required unless messages is supplied' },
    messages: { type: 'array', description: 'Chat messages, alternative to prompt; use messages:= with strict JSON' },
    system: { type: 'string', description: 'Optional system message prepended when using prompt' },
    max_tokens: { type: 'number', description: 'Optional output token limit; use --stream for long responses' },
  };
  for (const name of ['gpt-5.6-sol', 'gpt-5.6-terra', 'gpt-5.6-luna', 'gpt-6-astra']) schemas[name] = chat;

  if (model.apiType === 'openai-images' && !schemas[model.name]) schemas[model.name] = image;
  return schemas[model.name] ?? null;
}
