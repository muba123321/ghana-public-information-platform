import { eq } from 'drizzle-orm';
import { beforeEach, describe, expect, it } from 'vitest';
import type { Db } from '../client.ts';
import { getAdministration, listAdministrations } from '../repositories/administrations.ts';
import { listContextEvents, listIndicators } from '../repositories/indicators.ts';
import { listInstitutions } from '../repositories/institutions.ts';
import {
  administrations,
  changeLog,
  indicators,
  institutionVersions,
  sources,
} from '../schema/index.ts';
import { createTestDb } from '../testing.ts';
import { defaultSeedData, seed } from './seed.ts';

let db: Db;
beforeEach(async () => {
  db = await createTestDb();
});

describe('seed', () => {
  it('seeds 19 administrations', async () => {
    await seed(db);
    expect(await listAdministrations(db)).toHaveLength(19);
  });

  it('is idempotent', async () => {
    const first = await seed(db);
    const second = await seed(db);
    expect(first.inserted).toBeGreaterThan(19);
    expect(second).toEqual({ inserted: 0, updated: 0, deleted: 0 });
    expect(await listAdministrations(db)).toHaveLength(19);
  });

  it('logs every inserted row to the change log', async () => {
    const { inserted } = await seed(db);
    expect(await db.$count(changeLog)).toBe(inserted);
  });

  it('every administration has a source with a url', async () => {
    await seed(db);
    const rows = await db
      .select({ url: sources.url })
      .from(administrations)
      .innerJoin(sources, eq(administrations.sourceId, sources.id));
    expect(rows).toHaveLength(19);
    for (const r of rows) expect(r.url).toMatch(/^https:\/\//);
  });

  it('exactly one administration is open-ended and it is 2025-mahama-ii', async () => {
    await seed(db);
    const open = (await listAdministrations(db)).filter((a) => a.endDate === null);
    expect(open.map((a) => a.slug)).toEqual(['2025-mahama-ii']);
  });

  it('administrations tile the timeline with no gaps', async () => {
    await seed(db);
    const list = await listAdministrations(db);
    for (let i = 1; i < list.length; i++) expect(list[i]!.startDate).toBe(list[i - 1]!.endDate);
    expect(list[0]!.startDate).toBe('1957-03-06');
  });

  it('keeps every leader inside their administration tenure', async () => {
    await seed(db);
    for (const a of await listAdministrations(db)) {
      for (const l of a.leaders) {
        expect(l.startDate >= a.startDate).toBe(true);
        if (a.endDate) expect((l.endDate ?? a.endDate) <= a.endDate).toBe(true);
      }
    }
  });
});

describe('seed corrections', () => {
  it('replaces a leader whose start date is corrected instead of duplicating it', async () => {
    await seed(db);
    const corrected = {
      ...defaultSeedData,
      leaders: defaultSeedData.leaders.map((l) =>
        l.personSlug === 'kofi-abrefa-busia' ? { ...l, startDate: '1969-10-02' } : l,
      ),
    };
    const result = await seed(db, corrected);
    const busia = (await getAdministration(db, '1969-second-republic'))!.leaders.filter(
      (l) => l.personSlug === 'kofi-abrefa-busia',
    );
    expect(busia.map((l) => l.startDate)).toEqual(['1969-10-02']);
    expect(result).toEqual({ inserted: 1, updated: 0, deleted: 1 });
    const deletions = await db.select().from(changeLog).where(eq(changeLog.action, 'delete'));
    expect(deletions).toHaveLength(1);
  });

  it('can move an administration boundary later', async () => {
    await seed(db);
    const moved = {
      ...defaultSeedData,
      administrations: defaultSeedData.administrations.map((a) =>
        a.slug === '1966-nlc'
          ? { ...a, endDate: '1969-10-03' }
          : a.slug === '1969-second-republic'
            ? { ...a, startDate: '1969-10-03' }
            : a,
      ),
      leaders: defaultSeedData.leaders.map((l) =>
        l.administrationSlug === '1969-second-republic' && l.startDate === '1969-10-01'
          ? { ...l, startDate: '1969-10-03' }
          : l,
      ),
    };
    await expect(seed(db, moved)).resolves.toMatchObject({ updated: 2 });
    expect((await getAdministration(db, '1966-nlc'))!.endDate).toBe('1969-10-03');
  });
});

describe('indicator catalogue and context events', () => {
  it('seeds 17 published indicators, each with an https source', async () => {
    await seed(db);
    const list = await listIndicators(db);
    expect(list).toHaveLength(17);
    const rows = await db
      .select({ url: sources.url })
      .from(indicators)
      .innerJoin(sources, eq(indicators.sourceId, sources.id));
    for (const r of rows) expect(r.url).toMatch(/^https:\/\//);
  });

  it('marks modelled indicators as modelled', async () => {
    await seed(db);
    const modelled = (await listIndicators(db))
      .filter((i) => i.estimateType === 'modelled')
      .map((i) => i.code)
      .sort();
    expect(modelled).toEqual(['maternal-mortality', 'under5-mortality', 'unemployment']);
  });

  it('seeds sourced, published context events in date order', async () => {
    await seed(db);
    const events = await listContextEvents(db);
    expect(events.map((e) => e.date)).toEqual([
      '2007-07-01',
      '2008-09-15',
      '2010-11-03',
      '2015-04-03',
      '2018-09-28',
      '2020-03-11',
      '2022-12-19',
      '2023-05-17',
    ]);
    for (const e of events) expect(e.source.url).toMatch(/^https:\/\//);
  });
});

describe('catalogue changes', () => {
  it('retires an indicator removed from the catalogue instead of leaving it published', async () => {
    await seed(db);
    await seed(db, {
      ...defaultSeedData,
      indicators: defaultSeedData.indicators.filter((i) => i.code !== 'poverty'),
    });
    expect((await listIndicators(db)).map((i) => i.code)).not.toContain('poverty');
    const [row] = await db.select().from(indicators).where(eq(indicators.code, 'poverty'));
    expect(row!.reviewStatus).toBe('rejected');
  });
});

describe('ministry seed (Civil Service (Ministries) Instrument, 2025)', () => {
  it('seeds the sector ministries in force since 9 January 2025, each sourced', async () => {
    await seed(db);
    const list = await listInstitutions(db);
    expect(list).toHaveLength(13);
    expect(list.every((i) => i.since === '2025-01-09' && i.until === null)).toBe(true);
    for (const sector of [
      'economy',
      'agriculture',
      'education',
      'health',
      'infrastructure',
      'social-development',
    ]) {
      expect(list.some((i) => i.sectorSlug === sector)).toBe(true);
    }
    expect(list.map((i) => i.name)).toContain('Ministry of Energy and Green Transition');
    const rows = await db
      .select({ url: sources.url })
      .from(institutionVersions)
      .innerJoin(sources, eq(institutionVersions.sourceId, sources.id));
    expect(rows).toHaveLength(13);
    for (const r of rows) expect(r.url).toMatch(/^https:\/\//);
  });
});
