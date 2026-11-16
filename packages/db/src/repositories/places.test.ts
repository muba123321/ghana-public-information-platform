import { beforeAll, describe, expect, it } from 'vitest';
import type { Db } from '../client.ts';
import { seed } from '../seed/seed.ts';
import { createTestDb } from '../testing.ts';
import { listPlaces, listRegionProducts } from './places.ts';
import { listRegions } from './regions.ts';

let db: Db;
beforeAll(async () => {
  db = await createTestDb();
  await seed(db);
});

describe('places and farm products', () => {
  it('every place has a source and a one-sentence factual description', async () => {
    const places = await listPlaces(db);
    expect(places.length).toBe(21);
    for (const p of places) {
      expect(p.source.url).toMatch(/^https:\/\//);
      expect(p.about).not.toMatch(/\b(best|must-see|stunning|amazing|beautiful|breathtaking)\b/i);
    }
  });

  it('marks exactly the three UNESCO World Heritage sites', async () => {
    expect(
      (await listPlaces(db))
        .filter((p) => p.unesco)
        .map((p) => p.name)
        .sort(),
    ).toEqual(['Asante Traditional Buildings', 'Cape Coast Castle', 'Elmina Castle']);
  });

  it('filters places by region', async () => {
    const central = await listPlaces(db, { region: 'central' });
    expect(central.map((p) => p.name)).toEqual(
      expect.arrayContaining(['Cape Coast Castle', 'Kakum National Park']),
    );
    expect(central.every((p) => p.regionSlug === 'central')).toBe(true);
  });

  it('every current region has at least one main farm product', async () => {
    const products = await listRegionProducts(db);
    for (const r of await listRegions(db, { current: true })) {
      expect(
        products.some((p) => p.regionSlug === r.slug && p.rank === 'main'),
        r.slug,
      ).toBe(true);
    }
  });
});
