import { isLocalPath } from '../models/input-parser';
import type { ParsedInput } from '../models/input-parser';

export async function resolveInputs(
  input: ParsedInput,
  _uploader?: (path: string) => Promise<{ url: string; filename: string }>,
): Promise<ParsedInput> {
  const resolved: ParsedInput = {};

  for (const [key, value] of Object.entries(input)) {
    if (isLocalPath(value)) {
      // In P0, we keep @ paths as-is for user to understand
      // Real upload happens when --download triggers file API
      resolved[key] = value;
    } else {
      resolved[key] = value;
    }
  }

  return resolved;
}
