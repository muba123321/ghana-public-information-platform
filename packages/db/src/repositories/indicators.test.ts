import { beforeEach, describe, expect, it } from 'vitest';
import type { Db } from '../client.ts';
import { contextEvents, indicators, observations, sectors, sources } from '../schema/index.ts';
import { createTestDb } from '../testing.ts';
import { getIndicatorSeries, listContextEvents, listIndicators } from './indicators.ts';

let db: Db;
let sourceId: string;

const obs = (
  year: number,
  value: number | null,
  vintage: string,
  estimateType: 'reported' | 'projected' = 'reported',
) => ({
  indicatorCode: 'inflation',
  periodStart: `${year}-01-01`,
  periodEnd: `${year + 1}-01-01`,
  value,
  estimateType,
  sourceId,
  vintage,
});

beforeEach(async () => {
  db = await createTestDb();
  const [s] = await db
    .insert(sources)
    .values({
      publisher: 'World Bank',
      title: 'World Development Indicators',
      url: 'https://data.worldbank.org',
      sourceType: 'dataset',
      retrievedOn: '2026-11-10',
      licence: 'CC BY 4.0',
    })
    .returning();
  sourceId = s!.id;
  await db.insert(sectors).values({ slug: 'economy', name: 'Economy' });
  const base = {
    unit: '% per year',
    frequency: 'annual' as const,
    sectorSlug: 'economy',
    sourceKey: 'world-bank-wdi',
    estimateType: 'reported' as const,
    provenance: 'manual' as const,
  };
  await db.insert(indicators).values([
    {
      ...base,
      code: 'inflation',
      name: 'Inflation',
      definition: 'Price rises.',
      seriesCode: 'FP.CPI.TOTL.ZG',
      sourceId,
      reviewStatus: 'published',
    },
    { ...base, code: 'draft-one', name: 'Draft', definition: 'Hidden.', seriesCode: 'X', sourceId },
  ]);
  await db
    .insert(observations)
    .values([
      obs(2015, 17.1, '2026-01-01'),
      obs(2016, 17.5, '2026-01-01'),
      obs(2015, 17.2, '2026-11-10'),
      obs(2016, null, '2026-11-10'),
      obs(2017, 12.4, '2026-11-10'),
    ]);
});

describe('indicator repository', () => {
  it('lists published indicators with their year coverage', async () => {
    expect(await listIndicators(db)).toEqual([
      expect.objectContaining({
        code: 'inflation',
        firstYear: 2015,
        lastYear: 2017,
        sectorSlug: 'economy',
      }),
    ]);
  });

  it('returns the latest vintage by default, keeping nulls as null', async () => {
    const s = await getIndicatorSeries(db, 'inflation');
    expect(s!.vintage).toBe('2026-11-10');
    expect(s!.vintages).toEqual(['2026-11-10', '2026-01-01']);
    expect(s!.points.map((p) => p.value)).toEqual([17.2, null, 12.4]);
    expect(s!.source.licence).toBe('CC BY 4.0');
  });

  it('returns an older vintage when asked, and the latest for an unknown one', async () => {
    expect(
      (await getIndicatorSeries(db, 'inflation', { vintage: '2026-01-01' }))!.points.map(
        (p) => p.value,
      ),
    ).toEqual([17.1, 17.5]);
    expect((await getIndicatorSeries(db, 'inflation', { vintage: '1999-01-01' }))!.vintage).toBe(
      '2026-11-10',
    );
  });

  it('returns null for unknown or unpublished indicators', async () => {
    expect(await getIndicatorSeries(db, 'nope')).toBeNull();
    expect(await getIndicatorSeries(db, 'draft-one')).toBeNull();
  });

  it('rejects a duplicate observation for the same period, source and vintage', async () => {
    await expect(db.insert(observations).values(obs(2017, 1, '2026-11-10'))).rejects.toThrow();
  });

  it('lists published context events in date order, optionally within a range', async () => {
    await db.insert(contextEvents).values([
      {
        date: '2020-03-11',
        title: 'COVID-19 declared a pandemic by the WHO',
        kind: 'international',
        sourceId,
        provenance: 'manual',
        reviewStatus: 'published',
      },
      {
        date: '2007-07-01',
        title: 'Cedi redenominated',
        kind: 'methodology',
        sourceId,
        provenance: 'manual',
        reviewStatus: 'published',
      },
      {
        date: '2010-01-01',
        title: 'Draft event',
        kind: 'domestic',
        sourceId,
        provenance: 'manual',
      },
    ]);
    expect((await listContextEvents(db)).map((e) => e.date)).toEqual(['2007-07-01', '2020-03-11']);
    expect(
      (await listContextEvents(db, { start: '2015-01-01', end: '2026-01-01' })).map((e) => e.date),
    ).toEqual(['2020-03-11']);
  });
});

describe('indicator repository — source and coverage rules', () => {
  it("only uses the indicator's current source, even when another source has a newer vintage", async () => {
    const [other] = await db
      .insert(sources)
      .values({
        publisher: 'Other',
        title: 'Other dataset',
        url: 'https://other.example',
        sourceType: 'dataset',
        retrievedOn: '2026-12-01',
      })
      .returning();
    await db.insert(observations).values({ ...obs(2018, 99, '2026-12-01'), sourceId: other!.id });
    const s = await getIndicatorSeries(db, 'inflation');
    expect(s!.vintage).toBe('2026-11-10');
    expect(s!.vintages).toEqual(['2026-11-10', '2026-01-01']);
    expect(s!.points.map((p) => p.value)).toEqual([17.2, null, 12.4]);
  });

  it('reports year coverage from the latest vintage, excluding projections', async () => {
    await db
      .insert(observations)
      .values([obs(2030, 5, '2026-11-10', 'projected'), obs(2010, 9, '2026-01-01')]);
    expect((await listIndicators(db))[0]).toMatchObject({ firstYear: 2015, lastYear: 2017 });
    expect((await getIndicatorSeries(db, 'inflation'))!.indicator).toMatchObject({
      firstYear: 2015,
      lastYear: 2017,
    });
  });
});
