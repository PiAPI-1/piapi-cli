// Subprocess fixtures may only contact the explicitly owned loopback server.
const originalFetch = globalThis.fetch;
const guardedFetch = ((input: Parameters<typeof fetch>[0], init?: RequestInit) => {
  const url = input instanceof Request ? input.url : String(input);
  if (new URL(url).origin !== process.env.PIAPI_FIXTURE_ORIGIN) {
    throw new Error(`Fixture blocked external fetch: ${new URL(url).origin}`);
  }
  return originalFetch(input, init);
}) as typeof fetch;
guardedFetch.preconnect = originalFetch.preconnect;
globalThis.fetch = guardedFetch;
