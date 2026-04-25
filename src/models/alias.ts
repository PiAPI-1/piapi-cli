import { getModel } from './catalog';

export function resolveModel(name: string): { taskType: string; modelName: string } | null {
  const model = getModel(name);
  if (!model) return null;
  return { taskType: model.taskType, modelName: model.name };
}
