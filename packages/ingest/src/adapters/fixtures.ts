import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { GetJson } from './worldbank.ts';

/**
 * Serves recorded API responses instead of the network (tests, e2e, offline dev).
 * World Bank: fixtures/world-bank-wdi/<code>.p<page>.json (or <code>.json); IMF: fixtures/imf/<code>.json.
 * A missing fixture behaves like a series with no data.
 */
export function fixtureGetter(dir: string): GetJson {
  const read = (...candidates: string[]) => {
    for (const c of candidates) {
      const p = join(dir, c);
      if (existsSync(p)) return JSON.parse(readFileSync(p, 'utf8')) as unknown;
    }
    return undefined;
  };
  return async (url) => {
    const u = new URL(url);
    if (u.hostname === 'api.worldbank.org') {
      const code = decodeURIComponent(u.pathname.split('/').at(-1) ?? '');
      const page = u.searchParams.get('page') ?? '1';
      return (
        read(`world-bank-wdi/${code}.p${page}.json`, `world-bank-wdi/${code}.json`) ?? [
          { page: 1, pages: 1 },
          [],
        ]
      );
    }
    const code = decodeURIComponent(u.pathname.split('/').at(-1) ?? '');
    return read(`imf/${code}.json`) ?? { values: {} };
  };
}
