import { beforeAll, describe, expect, it } from 'vitest';
import type { Db } from '../client.ts';
import { regionLineage, regionObservations, sources } from '../schema/index.ts';
import { seed } from '../seed/seed.ts';
import { createTestDb } from '../testing.ts';
import { listIndicators } from './indicators.ts';
import { getRegion, listRegions, regionSeries } from './regions.ts';

let db: Db;
beforeAll(async () => {
  db = await createTestDb();
  await seed(db);
  const [src] = await db.select({ id: sources.id }).from(sources).limit(1);
  const row = (measuredFor: string, regionSlug: string, year: number, value: number) => ({
    indicatorCode: 'population-census',
    regionSlug,
    measuredForRegionSlug: measuredFor,
    periodStart: `${year}-01-01`,
    periodEnd: `${year + 1}-01-01`,
    value,
    estimateType: 'reported' as const,
    sourceId: src!.id,
    vintage: '2026-11-15',
  });
  await db.insert(regionObservations).values([
    row('northern-former', 'northern-former', 2010, 2479461),
    row('northern-former', 'northern-former', 2021, 999), // impossible after the split: never shown for a successor
    row('savannah', 'savannah', 2021, 653266),
    row('ashanti', 'ashanti', 2010, 4780380),
  ]);
});

describe('regions', () => {
  it('seeds 16 current and 4 former regions', async () => {
    expect(await listRegions(db, { current: true })).toHaveLength(16);
    const former = (await listRegions(db)).filter((r) => r.validTo !== null);
    expect(former.map((r) => r.slug).sort()).toEqual([
      'brong-ahafo',
      'northern-former',
      'volta-former',
      'western-former',
    ]);
  });

  it('lists current regions north to south', async () => {
    const slugs = (await listRegions(db, { current: true })).map((r) => r.slug);
    expect(slugs[0]).toBe('upper-west');
    expect(slugs.at(-1)).toBe('western');
  });

  it('records each 2019 split with its constitutional instrument', async () => {
    const rows = await db.select().from(regionLineage);
    expect(rows).toHaveLength(10);
    expect(rows.every((r) => r.effectiveOn === '2019-02-01' && r.sourceId)).toBe(true);
  });

  it('a successor region knows its former region', async () => {
    expect((await getRegion(db, 'savannah'))?.formerParents).toEqual([
      { slug: 'northern-former', name: 'Northern Region (before 2019)', until: '2019-02-01' },
    ]);
    expect((await getRegion(db, 'ashanti'))?.formerParents).toEqual([]);
  });

  it("gives a successor its own figures and its former region's earlier ones, each labelled", async () => {
    expect(await regionSeries(db, 'savannah', 'population-census')).toEqual([
      {
        year: 2010,
        value: 2479461,
        measuredFor: {
          slug: 'northern-former',
          name: 'Northern Region (before 2019)',
          former: true,
        },
      },
      {
        year: 2021,
        value: 653266,
        measuredFor: { slug: 'savannah', name: 'Savannah', former: false },
      },
    ]);
  });

  it('an original region has only its own figures', async () => {
    expect(
      (await regionSeries(db, 'ashanti', 'population-census')).map((p) => p.measuredFor.slug),
    ).toEqual(['ashanti']);
  });

  it('lists the regional indicators on request', async () => {
    const codes = (await listIndicators(db, { scope: 'regional' })).map((i) => i.code);
    expect(codes).toEqual(expect.arrayContaining(['population-census', 'skilled-birth-attendance']));
    expect(codes).not.toContain('inflation');
  });

  it('national indicator lists leave regional indicators out', async () => {
    expect((await listIndicators(db)).map((i) => i.code)).not.toContain('population-census');
  });
});
