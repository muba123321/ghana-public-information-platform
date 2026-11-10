import { fetchJson } from '../http.ts';
import type { RawPoint, SourceAdapter } from '../types.ts';
import { type GetJson, toPoint } from './worldbank.ts';

const BASE = 'https://www.imf.org/external/datamapper/api/v1';

/**
 * First year the current WEO edition forecasts. The October edition (current until the April one
 * appears) still forecasts its own year, so from January to April that is last year.
 */
export function weoFirstProjectedYear(today: string): number {
  const year = Number(today.slice(0, 4));
  return Number(today.slice(5, 7)) <= 4 ? year - 1 : year;
}

/**
 * IMF DataMapper. The API ignores country filters, so Ghana (GHA) is selected here.
 * WEO mixes history with forecasts: years the current edition forecasts are marked projected.
 */
export function createImfAdapter(
  sourceKey: 'imf-weo' | 'imf-fpp',
  get: GetJson = (u) => fetchJson(u),
): SourceAdapter {
  return {
    sourceKey,
    async fetch(seriesCode, { today, defaultEstimateType }) {
      const body = (await get(`${BASE}/${encodeURIComponent(seriesCode)}`)) as {
        values?: Record<string, Record<string, Record<string, unknown>>>;
      };
      const ghana = body.values?.[seriesCode]?.GHA;
      if (!ghana) return [];
      const firstProjected = weoFirstProjectedYear(today);
      const points: RawPoint[] = [];
      for (const [year, value] of Object.entries(ghana)) {
        const projected = sourceKey === 'imf-weo' && Number(year) >= firstProjected;
        const point = toPoint(year, value, projected ? 'projected' : defaultEstimateType);
        if (point) points.push(point);
      }
      return points.sort((a, b) => a.year.localeCompare(b.year));
    },
  };
}
