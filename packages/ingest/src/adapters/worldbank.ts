import { fetchJson } from '../http.ts';
import type { RawPoint, SourceAdapter } from '../types.ts';

export type GetJson = (url: string) => Promise<unknown>;

const BASE = 'https://api.worldbank.org/v2/country/GHA/indicator';

interface WbMeta {
  page: number;
  pages: number;
}
interface WbRow {
  date: unknown;
  value: unknown;
}

function parsePage(body: unknown): { meta: WbMeta; rows: WbRow[] } {
  if (!Array.isArray(body) || body.length === 0)
    throw new Error('World Bank: unexpected response shape');
  const [meta, rows] = body as [Record<string, unknown>, unknown];
  if (Array.isArray(meta.message)) {
    const msg = (meta.message as { value?: string }[]).map((m) => m.value).join('; ');
    throw new Error(`World Bank API error: ${msg}`);
  }
  return {
    meta: { page: Number(meta.page), pages: Number(meta.pages) || 1 },
    rows: Array.isArray(rows) ? (rows as WbRow[]) : [],
  };
}

/** A usable annual value, or null for missing/malformed rows (never stored, never zero). */
export function toPoint(
  year: unknown,
  value: unknown,
  estimateType: RawPoint['estimateType'],
): RawPoint | null {
  if (typeof year !== 'string' || !/^\d{4}$/.test(year)) return null;
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  return { year, value, estimateType };
}

/** World Development Indicators for Ghana; follows pagination, omits years with no value. */
export function createWorldBankAdapter(get: GetJson = (u) => fetchJson(u)): SourceAdapter {
  return {
    sourceKey: 'world-bank-wdi',
    async fetch(seriesCode, { defaultEstimateType }) {
      const points: RawPoint[] = [];
      for (let page = 1, pages = 1; page <= pages; page++) {
        const parsed = parsePage(
          await get(
            `${BASE}/${encodeURIComponent(seriesCode)}?format=json&per_page=100&page=${page}`,
          ),
        );
        pages = parsed.meta.pages;
        for (const r of parsed.rows) {
          const point = toPoint(r.date, r.value, defaultEstimateType);
          if (point) points.push(point);
        }
      }
      return points.sort((a, b) => a.year.localeCompare(b.year));
    },
  };
}
