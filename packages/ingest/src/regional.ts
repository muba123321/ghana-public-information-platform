import { and, type Db, eq, regionObservations, sources } from '@gpip/db';
import { DHS_INDICATORS, DHS_URL, parseDhsRegional } from './adapters/dhs.ts';
import type { GetJson } from './adapters/worldbank.ts';
import { fetchJson } from './http.ts';

const DHS_SOURCE = {
  url: 'https://api.dhsprogram.com/',
  title: 'DHS Program Indicator Data API — Ghana, by region',
};

/**
 * Imports regional figures from the DHS API. Append-only: a figure already stored for the same
 * indicator, geography, year and day is left as it is. Unknown region names are reported, never guessed.
 */
export async function importRegional(
  db: Db,
  opts: { get?: GetJson; today: string },
): Promise<{ inserted: number; errors: string[] }> {
  const get = opts.get ?? ((url: string) => fetchJson(url));
  const json = (await get(DHS_URL + Object.keys(DHS_INDICATORS).join(','))) as Parameters<
    typeof parseDhsRegional
  >[0];
  const { rows, errors } = parseDhsRegional(json);
  const [src] = await db
    .select({ id: sources.id })
    .from(sources)
    .where(and(eq(sources.url, DHS_SOURCE.url), eq(sources.title, DHS_SOURCE.title)));
  if (!src)
    return { inserted: 0, errors: [...errors, 'DHS source record missing — run the seed first'] };
  if (rows.length === 0) return { inserted: 0, errors };
  const inserted = await db
    .insert(regionObservations)
    .values(
      rows.map((r) => ({
        indicatorCode: r.code,
        regionSlug: r.regionSlug,
        measuredForRegionSlug: r.regionSlug,
        periodStart: `${r.year}-01-01`,
        periodEnd: `${r.year + 1}-01-01`,
        value: r.value,
        estimateType: 'reported' as const,
        sourceId: src.id,
        vintage: opts.today,
      })),
    )
    .onConflictDoNothing()
    .returning({ id: regionObservations.id });
  return { inserted: inserted.length, errors };
}
