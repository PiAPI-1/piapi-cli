import { describe, expect, test } from 'bun:test';
import {
  MODELS,
  getModel,
  getModelsByType,
  type ModelType,
} from '../../src/models/catalog';

const VALID_TYPES: ModelType[] = ['image', 'video', 'audio', '3d', 'llm'];
const VALID_API_TYPES = ['unified', 'openai-completions', 'openai-images'] as const;

describe('catalog integrity', () => {
  test('catalog is non-empty', () => {
    expect(MODELS.length).toBeGreaterThan(0);
  });

  test('every entry has required fields', () => {
    for (const m of MODELS) {
      expect(m.name, `${JSON.stringify(m)} missing name`).toBeTruthy();
      expect(m.model, `${m.name} missing model`).toBeTruthy();
      expect(m.provider, `${m.name} missing provider`).toBeTruthy();
      expect(VALID_TYPES, `${m.name} has invalid type ${m.type}`).toContain(m.type);
    }
  });

  test('apiType is one of the supported surfaces (or omitted = unified)', () => {
    for (const m of MODELS) {
      if (m.apiType !== undefined) {
        expect(
          VALID_API_TYPES,
          `${m.name} has invalid apiType ${m.apiType}`,
        ).toContain(m.apiType);
      }
    }
  });

  test('unified-API entries declare a taskType; openai-compat entries do not', () => {
    for (const m of MODELS) {
      const surface = m.apiType ?? 'unified';
      if (surface === 'unified') {
        expect(m.taskType, `unified model ${m.name} missing taskType`).toBeTruthy();
      } else {
        expect(m.taskType, `${surface} model ${m.name} should not set taskType`).toBeUndefined();
      }
    }
  });

  test('no duplicate model names', () => {
    const seen = new Set<string>();
    const dupes: string[] = [];
    for (const m of MODELS) {
      if (seen.has(m.name)) dupes.push(m.name);
      seen.add(m.name);
    }
    expect(dupes).toEqual([]);
  });
});

describe('catalog lookups', () => {
  test('getModel returns a known entry', () => {
    const m = getModel('flux-dev');
    expect(m).toBeDefined();
    expect(m?.type).toBe('image');
  });

  test('getModel returns undefined for unknown', () => {
    expect(getModel('definitely-not-a-real-model')).toBeUndefined();
  });

  test('getModelsByType partitions exhaustively', () => {
    let total = 0;
    for (const t of VALID_TYPES) total += getModelsByType(t).length;
    expect(total).toBe(MODELS.length);
  });
});
