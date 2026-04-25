import { readConfigFile } from '../config/loader';

export function resolveAPIKey(flagKey?: string): string | undefined {
  return flagKey ?? process.env.PIAPI_API_KEY ?? readConfigFile().apiKey;
}
