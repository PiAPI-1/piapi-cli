import { z } from 'zod';

export const ConfigSchema = z.object({
  apiKey: z.string().optional(),
  baseUrl: z.string().optional(),
});

export type Config = z.infer<typeof ConfigSchema>;

export const DEFAULT_BASE_URL = 'https://api.piapi.ai';
