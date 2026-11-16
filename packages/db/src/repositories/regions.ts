import type { IsoDate } from '@gpip/core';
import { and, asc, eq, inArray, isNull } from 'drizzle-orm';
import type { Db } from '../client.ts';
import { regionLineage, regionObservations, regions } from '../schema/index.ts';

export interface RegionSummary {
  slug: string;
  name: string;
  capital: string | null;
  /** null = existed before our earliest regional figures. */
  validFrom: IsoDate | null;
  /** Set only on former regions (split in 2019). */
  validTo: IsoDate | null;
}

export interface RegionDetail extends RegionSummary {
  /** The former region(s) this region was carved from, with the date they ceased to exist. */
  formerParents: { slug: string; name: string; until: IsoDate }[];
}

export interface RegionPoint {
  year: number;
  value: number | null;
  /** The geography the figure actually describes — never re-attributed. */
  measuredFor: { slug: string; name: string; former: boolean };
}

const published = eq(regions.reviewStatus, 'published');
const summaryColumns = {
  slug: regions.slug,
  name: regions.name,
  capital: regions.capital,
  validFrom: regions.validFrom,
  validTo: regions.validTo,
};

/** Regions north to south; `current` leaves out the four former regions. */
export function listRegions(db: Db, opts: { current?: boolean } = {}): Promise<RegionSummary[]> {
  return db
    .select(summaryColumns)
    .from(regions)
    .where(opts.current ? and(published, isNull(regions.validTo)) : published)
    .orderBy(asc(regions.displayOrder));
}

export async function getRegion(db: Db, slug: string): Promise<RegionDetail | null> {
  const [region] = await db
    .select(summaryColumns)
    .from(regions)
    .where(and(published, eq(regions.slug, slug)));
  if (!region) return null;
  const parents = await db
    .select({ slug: regions.slug, name: regions.name, until: regionLineage.effectiveOn })
    .from(regionLineage)
    .innerJoin(regions, eq(regionLineage.fromSlug, regions.slug))
    .where(eq(regionLineage.toSlug, slug))
    .orderBy(asc(regions.displayOrder));
  return { ...region, formerParents: parents };
}

/**
 * A region's figures for one indicator, oldest first: its own, plus its former region's figures for
 * periods that began before the split. Each point says which geography it describes.
 */
export async function regionSeries(db: Db, slug: string, code: string): Promise<RegionPoint[]> {
  const region = await getRegion(db, slug);
  if (!region) return [];
  const geographies = [slug, ...region.formerParents.map((p) => p.slug)];
  const rows = await db
    .select({
      periodStart: regionObservations.periodStart,
      value: regionObservations.value,
      measuredFor: regionObservations.measuredForRegionSlug,
      vintage: regionObservations.vintage,
    })
    .from(regionObservations)
    .where(
      and(
        eq(regionObservations.indicatorCode, code),
        inArray(regionObservations.measuredForRegionSlug, geographies),
      ),
    )
    .orderBy(asc(regionObservations.periodStart));

  const names = new Map<string, { name: string; former: boolean; until: IsoDate | null }>([
    [slug, { name: region.name, former: false, until: null }],
    ...region.formerParents.map(
      (p) => [p.slug, { name: p.name, former: true, until: p.until }] as const,
    ),
  ]);
  // Latest vintage per geography and period.
  const latest = new Map<string, (typeof rows)[number]>();
  for (const r of rows) {
    const key = `${r.measuredFor}|${r.periodStart}`;
    const seen = latest.get(key);
    if (!seen || r.vintage > seen.vintage) latest.set(key, r);
  }
  return [...latest.values()]
    .filter((r) => {
      const g = names.get(r.measuredFor);
      // A former region's figures only for periods that started before it ceased to exist.
      return g && (!g.former || (g.until !== null && r.periodStart < g.until));
    })
    .map((r) => {
      const g = names.get(r.measuredFor) as { name: string; former: boolean };
      return {
        year: Number(r.periodStart.slice(0, 4)),
        value: r.value,
        measuredFor: { slug: r.measuredFor, name: g.name, former: g.former },
      };
    });
}
