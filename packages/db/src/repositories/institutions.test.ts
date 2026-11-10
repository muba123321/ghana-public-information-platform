import { beforeAll, describe, expect, it } from 'vitest';
import type { Db } from '../client.js';
import { institutionLineage, institutions, institutionVersions, sources } from '../schema/index.js';
import { createTestDb } from '../testing.js';
import { getInstitutionHistory } from './institutions.js';

let db: Db;
beforeAll(async () => {
  db = await createTestDb();
  const [s] = await db
    .insert(sources)
    .values({
      publisher: 'Test',
      title: 'Fixture',
      url: 'https://example.org',
      sourceType: 'reference_work',
      retrievedOn: '2026-11-09',
    })
    .returning();
  await db.insert(institutions).values([
    { slug: 'roads-old', kind: 'ministry' },
    { slug: 'roads', kind: 'ministry' },
  ]);
  const v = { sourceId: s!.id, provenance: 'manual' as const, reviewStatus: 'published' as const };
  await db.insert(institutionVersions).values([
    {
      ...v,
      institutionSlug: 'roads',
      name: 'Ministry of Roads and Transport',
      validFrom: '2001-01-07',
      validTo: '2009-01-07',
    },
    {
      ...v,
      institutionSlug: 'roads',
      name: 'Ministry of Roads and Highways',
      validFrom: '2009-01-07',
      validTo: null,
    },
  ]);
  await db.insert(institutionLineage).values({
    fromSlug: 'roads-old',
    toSlug: 'roads',
    kind: 'renamed',
    effectiveOn: '2001-01-07',
    sourceId: s!.id,
  });
});

describe('institution repository', () => {
  it('returns versions in order with lineage edges', async () => {
    const h = await getInstitutionHistory(db, 'roads');
    expect(h!.versions.map((v) => v.name)).toEqual([
      'Ministry of Roads and Transport',
      'Ministry of Roads and Highways',
    ]);
    expect(h!.lineage).toEqual([
      expect.objectContaining({ fromSlug: 'roads-old', toSlug: 'roads', kind: 'renamed' }),
    ]);
  });

  it('returns null for an unknown institution', async () => {
    expect(await getInstitutionHistory(db, 'nope')).toBeNull();
  });
});
