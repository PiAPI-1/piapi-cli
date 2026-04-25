import { readConfigFile } from '../config/loader';

export function isLoggedIn(): boolean {
  return !!readConfigFile().apiKey;
}
