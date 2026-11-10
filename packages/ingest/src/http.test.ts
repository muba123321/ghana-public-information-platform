import { describe, expect, it } from 'vitest';
import { fetchJson } from './http.ts';

describe('fetchJson', () => {
  it('retries failures then succeeds', async () => {
    let calls = 0;
    const fetchImpl = (async () => {
      calls++;
      if (calls < 3) throw new Error('network down');
      return new Response('{"ok":true}', { status: 200 });
    }) as typeof fetch;
    await expect(
      fetchJson('https://x.test', { fetchImpl, retries: 2, backoffMs: 0 }),
    ).resolves.toEqual({ ok: true });
    expect(calls).toBe(3);
  });

  it('gives up after the retries and reports the URL', async () => {
    const fetchImpl = (async () => new Response('busy', { status: 503 })) as typeof fetch;
    await expect(
      fetchJson('https://x.test/a', { fetchImpl, retries: 1, backoffMs: 0 }),
    ).rejects.toThrow(/x\.test\/a.*503/);
  });

  it('aborts a request that exceeds the timeout', async () => {
    const fetchImpl = ((_u: string, init?: RequestInit) =>
      new Promise((_r, reject) =>
        init?.signal?.addEventListener('abort', () => reject(new Error('aborted'))),
      )) as typeof fetch;
    await expect(
      fetchJson('https://x.test', { fetchImpl, retries: 0, timeoutMs: 20 }),
    ).rejects.toThrow();
  });
});
