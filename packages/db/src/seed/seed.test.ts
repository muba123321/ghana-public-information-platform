import { eq } from 'drizzle-orm';
import { beforeEach, describe, expect, it } from 'vitest';
import type { Db } from '../client.ts';
import { listAdministrations } from '../repositories/administrations.ts';
import { administrations, changeLog, sources } from '../schema/index.ts';
import { createTestDb } from '../testing.ts';
import { seed } from './seed.ts';

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
    expect(second).toEqual({ inserted: 0, updated: 0 });
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
