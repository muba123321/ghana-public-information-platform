import { and, asc, eq } from 'drizzle-orm';
import type { Db } from '../client.ts';
import { places, regionProducts, regions, sources } from '../schema/index.ts';

export interface Place {
  slug: string;
  name: string;
  kind: string;
  animal: string | null;
  regionSlug: string;
  lat: number;
  lon: number;
  about: string;
  unesco: boolean;
  source: { publisher: string; title: string; url: string };
}

export async function listPlaces(db: Db, opts: { region?: string } = {}): Promise<Place[]> {
  const rows = await db
    .select({
      slug: places.slug,
      name: places.name,
      kind: places.kind,
      animal: places.animal,
      regionSlug: places.regionSlug,
      lat: places.lat,
      lon: places.lon,
      about: places.about,
      unesco: places.unesco,
      publisher: sources.publisher,
      title: sources.title,
      url: sources.url,
    })
    .from(places)
    .innerJoin(sources, eq(places.sourceId, sources.id))
    .innerJoin(regions, eq(places.regionSlug, regions.slug))
    .where(
      and(
        eq(places.reviewStatus, 'published'),
        opts.region ? eq(places.regionSlug, opts.region) : undefined,
      ),
    )
    .orderBy(asc(regions.displayOrder), asc(places.name));
  return rows.map(({ publisher, title, url, unesco, ...p }) => ({
    ...p,
    unesco: unesco === 1,
    source: { publisher, title, url },
  }));
}

export interface RegionProduct {
  regionSlug: string;
  product: string;
  kind: string;
  rank: string;
  source: { publisher: string; title: string; url: string };
}

export async function listRegionProducts(
  db: Db,
  opts: { region?: string } = {},
): Promise<RegionProduct[]> {
  const rows = await db
    .select({
      regionSlug: regionProducts.regionSlug,
      product: regionProducts.product,
      kind: regionProducts.kind,
      rank: regionProducts.rank,
      publisher: sources.publisher,
      title: sources.title,
      url: sources.url,
    })
    .from(regionProducts)
    .innerJoin(sources, eq(regionProducts.sourceId, sources.id))
    .where(
      and(
        eq(regionProducts.reviewStatus, 'published'),
        opts.region ? eq(regionProducts.regionSlug, opts.region) : undefined,
      ),
    )
    .orderBy(asc(regionProducts.regionSlug), asc(regionProducts.id));
  return rows.map(({ publisher, title, url, ...p }) => ({
    ...p,
    source: { publisher, title, url },
  }));
}
