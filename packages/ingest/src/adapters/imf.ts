import { fetchJson } from '../http.ts';
import type { RawPoint, SourceAdapter } from '../types.ts';
import type { GetJson } from './worldbank.ts';

const BASE = 'https://www.imf.org/external/datamapper/api/v1';

/**
 * IMF DataMapper. The API ignores country filters, so Ghana (GHA) is selected here.
 * WEO mixes history with forecasts: years from the retrieval year onward are marked projected.
 */
export function createImfAdapter(
  sourceKey: 'imf-weo' | 'imf-fpp',
  get: GetJson = (u) => fetchJson(u),
): SourceAdapter {
  return {
    sourceKey,
    async fetch(seriesCode, { today, defaultEstimateType }) {
      const body = (await get(`${BASE}/${encodeURIComponent(seriesCode)}`)) as {
        values?: Record<string, Record<string, Record<string, number | null>>>;
      };
      const ghana = body.values?.[seriesCode]?.GHA;
      if (!ghana) return [];
      const currentYear = Number(today.slice(0, 4));
      const points: RawPoint[] = [];
      for (const [year, value] of Object.entries(ghana)) {
        if (value === null || value === undefined || !/^\d{4}$/.test(year)) continue;
        const projected = sourceKey === 'imf-weo' && Number(year) >= currentYear;
        points.push({
          year,
          value: Number(value),
          estimateType: projected ? 'projected' : defaultEstimateType,
        });
      }
      return points.sort((a, b) => a.year.localeCompare(b.year));
    },
  };
}
