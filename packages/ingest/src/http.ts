export interface FetchJsonOptions {
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
  retries?: number;
  backoffMs?: number;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * GET a JSON document with a per-attempt timeout and retries with linear backoff.
 * Public statistics APIs (notably the World Bank's) sometimes stall; a hung call must not hang the run.
 */
export async function fetchJson(url: string, opts: FetchJsonOptions = {}): Promise<unknown> {
  const { fetchImpl = fetch, timeoutMs = 25_000, retries = 2, backoffMs = 2_000 } = opts;
  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    if (attempt > 0) await sleep(backoffMs * attempt);
    try {
      const res = await fetchImpl(url, {
        signal: AbortSignal.timeout(timeoutMs),
        headers: {
          accept: 'application/json',
          'user-agent':
            'GPIP-ingest (+https://github.com/muba123321/ghana-public-information-platform)',
        },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (e) {
      lastError = e;
    }
  }
  const reason = lastError instanceof Error ? lastError.message : String(lastError);
  throw new Error(`GET ${url} failed after ${retries + 1} attempt(s): ${reason}`);
}
