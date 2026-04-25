import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { existsSync } from 'node:fs';
import { CONFIG_DIR, CONFIG_FILE } from './paths';
import { ConfigSchema, type Config, DEFAULT_BASE_URL } from './schema';

// Track whether we've already warned this run, so a corrupt config doesn't
// emit the same line on every internal call (readConfigFile fires multiple
// times via auth/main/status-bar paths).
let warnedThisRun = false;

export function readConfigFile(): Config {
  if (!existsSync(CONFIG_FILE)) return {};
  try {
    const raw = readFileSync(CONFIG_FILE, 'utf-8');
    return ConfigSchema.parse(JSON.parse(raw));
  } catch (e) {
    if (!warnedThisRun) {
      warnedThisRun = true;
      const reason = e instanceof Error ? e.message.split('\n')[0] : String(e);
      process.stderr.write(
        `⚠ Config at ${CONFIG_FILE} is unreadable (${reason}); falling back to env/defaults. Run "piapi auth login" to rewrite it.\n`,
      );
    }
    return {};
  }
}

export function writeConfigFile(config: Config): void {
  mkdirSync(CONFIG_DIR, { recursive: true });
  writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
}

export function loadConfig(overrides: Partial<Config> = {}): Config {
  const base = readConfigFile();
  return {
    apiKey: base.apiKey ?? overrides.apiKey,
    baseUrl: (base.baseUrl ?? overrides.baseUrl) ?? DEFAULT_BASE_URL,
  };
}
