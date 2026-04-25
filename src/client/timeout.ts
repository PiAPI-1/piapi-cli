// Shared fetch timeouts. Without these, a slow CDN or unresponsive endpoint
// will hang the CLI indefinitely. Streaming requests opt out — they're
// incremental by design, and users can Ctrl-C if needed.
//
// Override defaults with `PIAPI_TIMEOUT_MS` (applies to all non-stream fetches).

export const DEFAULT_API_TIMEOUT_MS = 30_000;
export const DEFAULT_TRANSFER_TIMEOUT_MS = 60_000;

function envOverride(): number | undefined {
  const v = process.env.PIAPI_TIMEOUT_MS;
  if (!v) return undefined;
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

export function resolveTimeout(defaultMs: number): number {
  return envOverride() ?? defaultMs;
}

export function timeoutSignal(defaultMs: number): AbortSignal {
  return AbortSignal.timeout(resolveTimeout(defaultMs));
}
