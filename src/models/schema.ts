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
    'flux-pro': {
      prompt: { type: 'string', required: true, description: 'Text prompt' },
      aspect_ratio: { type: 'string', default: '1:1' },
      num_outputs: { type: 'number', default: 1 },
    },
    'midjourney': {
      prompt: { type: 'string', required: true, description: 'Text prompt' },
      aspect_ratio: { type: 'string', default: '1:1' },
      style: { type: 'string', default: 'raw' },
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

  return schemas[model.name] ?? null;
}
