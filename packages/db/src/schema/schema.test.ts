import { beforeEach, describe, expect, it } from 'vitest';
import type { Db } from '../client.js';
import { createTestDb } from '../testing.js';
import { administrations, institutions, institutionVersions, sources } from './index.js';

let db: Db;
let sourceId: string;

beforeEach(async () => {
  db = await createTestDb();
  const [s] = await db
    .insert(sources)
    .values({
      publisher: 'Test',
      title: 'Test source',
      url: 'https://example.org',
      sourceType: 'reference_work',
      retrievedOn: '2026-11-09',
    })
    .returning({ id: sources.id });
  sourceId = s!.id;
});

const admin = (slug: string, startDate: string, endDate: string | null) => ({
  slug,
  name: slug,
  kind: 'civilian' as const,
  startDate,
  endDate,
  sourceId,
  provenance: 'manual' as const,
});

/** Drizzle wraps driver errors; the constraint name lives on the cause. */
async function rejectionText(p: Promise<unknown>): Promise<string> {
  try {
    await p;
  } catch (e) {
    const err = e as Error & { cause?: Error & { constraint?: string } };
    return `${err.message} ${err.cause?.message ?? ''} ${err.cause?.constraint ?? ''}`;
  }
  throw new Error('expected promise to reject');
}

describe('schema integrity', () => {
  it('rejects an administration without a source', async () => {
    const row = { ...admin('a', '1993-01-07', '1997-01-07'), sourceId: null as unknown as string };
    await expect(db.insert(administrations).values(row)).rejects.toThrow();
  });

  it('rejects overlapping administrations', async () => {
    await db.insert(administrations).values(admin('a', '1993-01-07', '1997-01-07'));
    const text = await rejectionText(
      db.insert(administrations).values(admin('b', '1996-01-01', '2001-01-07')),
    );
    expect(text).toContain('administrations_no_overlap');
  });

  it('allows back-to-back tenures sharing a boundary date', async () => {
    await db.insert(administrations).values(admin('a', '1993-01-07', '1997-01-07'));
    await expect(
      db.insert(administrations).values(admin('b', '1997-01-07', '2001-01-07')),
    ).resolves.toBeDefined();
  });

  it('rejects two open-ended administrations', async () => {
    await db.insert(administrations).values(admin('a', '2025-01-07', null));
    const text = await rejectionText(
      db.insert(administrations).values(admin('b', '2026-01-07', null)),
    );
    expect(text).toContain('administrations_no_overlap');
  });

  it('rejects end_date before start_date', async () => {
    await expect(
      db.insert(administrations).values(admin('a', '2001-01-07', '1997-01-07')),
    ).rejects.toThrow();
  });

  it('rejects overlapping versions of the same institution but allows them across institutions', async () => {
    await db.insert(institutions).values([
      { slug: 'mof', kind: 'ministry' },
      { slug: 'moh', kind: 'ministry' },
    ]);
    const v = (institutionSlug: string, validFrom: string, validTo: string | null) => ({
      institutionSlug,
      name: institutionSlug,
      validFrom,
      validTo,
      sourceId,
      provenance: 'manual' as const,
    });
    await db.insert(institutionVersions).values(v('mof', '2001-01-01', null));
    await expect(
      db.insert(institutionVersions).values(v('moh', '2001-01-01', null)),
    ).resolves.toBeDefined();
    const text = await rejectionText(
      db.insert(institutionVersions).values(v('mof', '2010-01-01', null)),
    );
    expect(text).toContain('institution_versions_no_overlap');
  });
});
