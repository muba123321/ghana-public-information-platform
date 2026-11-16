import 'server-only';
import {
  getRegion,
  listCommitmentsForRegion,
  listIndicators,
  listPlaces,
  listRegionProducts,
  listRegions,
  regionSeries,
} from '@gpip/db';
import { cache } from 'react';
import { getDb } from '@/server/db';

/** Current regions, north to south. */
export const loadRegions = cache(async () => listRegions(await getDb(), { current: true }));

/** Everything a region page shows; null for an unknown or former region. */
export const loadRegion = cache(async (slug: string) => {
  const db = await getDb();
  const region = await getRegion(db, slug);
  if (!region || region.validTo !== null) return null;
  const indicators = await listIndicators(db, { scope: 'regional' });
  const [figures, commitments, places, products] = await Promise.all([
    Promise.all(
      indicators.map(async (i) => ({
        code: i.code,
        name: i.name,
        unit: i.unit,
        definition: i.definition,
        points: await regionSeries(db, slug, i.code),
      })),
    ),
    listCommitmentsForRegion(db, slug),
    listPlaces(db, { region: slug }),
    listRegionProducts(db, { region: slug }),
  ]);
  return { region, figures, commitments, places, products };
});
