// Lightweight npm update check. Two design constraints:
//   1. Zero added latency on the happy path. We print from cache, never await
//      the network. A stale cache triggers a background refresh whose result
//      surfaces on the *next* run.
//   2. Silent on every failure. Network down, npm 5xx, malformed JSON, no
//      $HOME write permission — none of it should leak to the user.
//
// Cache lives at ~/.piapi/.update-cache.json with shape:
//   { lastChecked: epoch_ms, latestVersion: '0.1.5' | null }

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { CONFIG_DIR, UPDATE_CACHE_FILE } from './config/paths';

const CHECK_TTL_MS = 24 * 60 * 60 * 1000;   // refresh cache once a day
const FETCH_TIMEOUT_MS = 2_000;             // hard cap on the registry call
const REGISTRY_URL = 'https://registry.npmjs.org/piapi-cli/latest';

interface UpdateCache {
  lastChecked: number;
  latestVersion: string | null;
}

function readCache(): UpdateCache | null {
  if (!existsSync(UPDATE_CACHE_FILE)) return null;
  try {
    const raw = readFileSync(UPDATE_CACHE_FILE, 'utf-8');
    const data = JSON.parse(raw) as UpdateCache;
    if (typeof data.lastChecked !== 'number') return null;
    return data;
  } catch {
    return null;
  }
}

function writeCache(cache: UpdateCache): void {
  try {
    mkdirSync(CONFIG_DIR, { recursive: true });
    writeFileSync(UPDATE_CACHE_FILE, JSON.stringify(cache));
  } catch { /* swallow — purely cosmetic feature */ }
}

// Compare two semver-ish strings ("0.1.0" vs "0.1.5"). Returns true if `a` is
// strictly newer than `b`. Pre-release tags (`-dev`, `-beta`) are treated as
// older than their base version, so dev builds always see real releases as new.
export function isNewer(a: string, b: string): boolean {
  const stripPre = (v: string) => v.split('-')[0]!;
  const aBase = stripPre(a);
  const bBase = stripPre(b);
  const aHasPre = a.includes('-');
  const bHasPre = b.includes('-');

  const ap = aBase.split('.').map(Number);
  const bp = bBase.split('.').map(Number);
  const len = Math.max(ap.length, bp.length);

  for (let i = 0; i < len; i++) {
    const ai = ap[i] ?? 0;
    const bi = bp[i] ?? 0;
    if (Number.isNaN(ai) || Number.isNaN(bi)) return false;
    if (ai > bi) return true;
    if (ai < bi) return false;
  }
  // Bases equal — a stable release is newer than a pre-release of same base.
  return !aHasPre && bHasPre;
}

function startBackgroundRefresh(): void {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  fetch(REGISTRY_URL, { signal: controller.signal, headers: { Accept: 'application/json' } })
    .then((r) => (r.ok ? r.json() : null))
    .then((data) => {
      const v = (data as { version?: string } | null)?.version;
      if (typeof v === 'string') {
        writeCache({ lastChecked: Date.now(), latestVersion: v });
      } else {
        // Mark the attempt so we don't hammer on every run when the response
        // shape is wrong.
        writeCache({ lastChecked: Date.now(), latestVersion: null });
      }
    })
    .catch(() => { writeCache({ lastChecked: Date.now(), latestVersion: null }); })
    .finally(() => clearTimeout(timer));
}

// Public entry point. Call once near the end of main() with the running
// version. Prints an update hint to stderr if the cache says we're behind.
// Never throws, never blocks meaningfully.
export function maybeNotifyUpdate(currentVersion: string): void {
  // No point checking on dev builds — they're always behind by definition.
  if (currentVersion.includes('-dev') || currentVersion === '0.0.0') return;
  if (!process.stderr.isTTY) return;
  if (process.env.PIAPI_NO_UPDATE_CHECK) return;

  const cache = readCache();
  const fresh = cache && Date.now() - cache.lastChecked < CHECK_TTL_MS;

  if (!fresh) startBackgroundRefresh();

  const latest = cache?.latestVersion;
  if (latest && isNewer(latest, currentVersion)) {
    process.stderr.write(
      `\n→ Update available: piapi-cli ${currentVersion} → ${latest}. Run "npm install -g piapi-cli" to upgrade.\n`,
    );
  }
}
