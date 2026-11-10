import { eq } from 'drizzle-orm';
import { beforeAll, describe, expect, it } from 'vitest';
import type { Db } from '../client.js';
import { administrations } from '../schema/index.js';
import { seed } from '../seed/seed.js';
import { createTestDb } from '../testing.js';
import { getAdministration, listAdministrations, listPersonTenures } from './administrations.js';

let db: Db;
beforeAll(async () => {
  db = await createTestDb();
  await seed(db);
});

describe('administration repository', () => {
  it('lists in chronological order', async () => {
    const list = await listAdministrations(db);
    expect(list[0]!.slug).toBe('1957-dominion');
    expect(list.at(-1)!.slug).toBe('2025-mahama-ii');
    const starts = list.map((a) => a.startDate);
    expect(starts).toEqual([...starts].sort());
  });

  it('returns both heads of state of the 2009–2013 term in order, with neighbours', async () => {
    const a = await getAdministration(db, '2009-mills-mahama');
    const heads = a!.leaders.filter((l) => l.role === 'head_of_state');
    expect(heads.map((l) => [l.fullName, l.startDate, l.endDate])).toEqual([
      ['John Evans Atta Mills', '2009-01-07', '2012-07-24'],
      ['John Dramani Mahama', '2012-07-24', null],
    ]);
    expect(a!.previous?.slug).toBe('2005-kufuor-ii');
    expect(a!.next?.slug).toBe('2013-mahama-i');
    expect(a!.source.url).toMatch(/^https:\/\//);
    expect(a!.party?.abbreviation).toBe('NDC');
  });

  it('has no previous for the first and no next for the incumbent', async () => {
    expect((await getAdministration(db, '1957-dominion'))!.previous).toBeNull();
    expect((await getAdministration(db, '2025-mahama-ii'))!.next).toBeNull();
  });

  it('returns null for an unknown slug', async () => {
    expect(await getAdministration(db, 'nope')).toBeNull();
  });

  it('derives compare-by-person tenures from leader records', async () => {
    const t = await listPersonTenures(db, 'jerry-john-rawlings');
    expect(t.map((x) => x.slug)).toEqual([
      '1979-afrc',
      '1981-pndc',
      '1993-rawlings-i',
      '1997-rawlings-ii',
    ]);
    const m = await listPersonTenures(db, 'john-dramani-mahama');
    expect(m).toEqual([
      { slug: '2009-mills-mahama', start: '2012-07-24', end: '2013-01-07' },
      { slug: '2013-mahama-i', start: '2013-01-07', end: '2017-01-07' },
      { slug: '2025-mahama-ii', start: '2025-01-07', end: null },
    ]);
  });

  it('excludes unpublished administrations', async () => {
    const local = await createTestDb();
    await seed(local);
    await local
      .update(administrations)
      .set({ reviewStatus: 'draft' })
      .where(eq(administrations.slug, '1957-dominion'));
    expect(await listAdministrations(local)).toHaveLength(18);
    expect(await getAdministration(local, '1957-dominion')).toBeNull();
    expect((await getAdministration(local, '1960-first-republic'))!.previous).toBeNull();
  });
});
