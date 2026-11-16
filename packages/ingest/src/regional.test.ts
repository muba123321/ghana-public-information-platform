import { and, eq, regionObservations } from '@gpip/db';
import { seed } from '@gpip/db/node';
import { createTestDb } from '@gpip/db/testing';
import { describe, expect, it } from 'vitest';
import { FIXTURES_DIR, fixtureGetter } from './adapters/index.ts';
import { importRegional } from './regional.ts';

describe('importRegional', () => {
  it('stores every DHS figure with the geography it describes, once', async () => {
    const db = await createTestDb();
    await seed(db);
    const get = fixtureGetter(FIXTURES_DIR);
    const first = await importRegional(db, { get, today: '2026-11-15' });
    expect(first.errors).toEqual([]);
    expect(first.inserted).toBeGreaterThan(100);
    const again = await importRegional(db, { get, today: '2026-11-15' });
    expect(again.inserted).toBe(0);
    const savannah = await db
      .select()
      .from(regionObservations)
      .where(and(eq(regionObservations.measuredForRegionSlug, 'savannah')));
    expect(savannah.every((r) => r.periodStart >= '2019-01-01')).toBe(true);
    expect(savannah.length).toBeGreaterThan(0);
  });
});
