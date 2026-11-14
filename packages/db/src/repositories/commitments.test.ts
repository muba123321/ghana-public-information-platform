import { beforeAll, describe, expect, it } from 'vitest';
import type { Db } from '../client.ts';
import {
  changeLog,
  commitmentBudgets,
  commitmentInstitutions,
  commitmentLinks,
  commitmentStewardships,
  commitments,
  documents,
  institutions,
  institutionVersions,
  sources,
} from '../schema/index.ts';
import { seed } from '../seed/seed.ts';
import { createTestDb } from '../testing.ts';
import {
  getCommitment,
  listChangeLog,
  listCommitments,
  listCommitmentsForAdministration,
  listOutstanding,
  listPublicDocuments,
} from './commitments.ts';

let db: Db;

beforeAll(async () => {
  db = await createTestDb();
  await seed(db);
  const [src] = await db
    .insert(sources)
    .values({
      publisher: 'NDC',
      title: '2012 Manifesto',
      url: 'https://example.org/ndc-2012.pdf',
      sourceType: 'manifesto',
      retrievedOn: '2026-11-14',
    })
    .returning();
  const [doc] = await db
    .insert(documents)
    .values({
      sourceId: src!.id,
      title: '2012 Manifesto',
      docType: 'manifesto',
      administrationSlug: '2013-mahama-i',
      pages: 120,
      mime: 'application/pdf',
      sha256: 'a'.repeat(64),
      storageKey: 'documents/a.pdf',
      bytes: 10,
    })
    .returning();
  const base = { documentId: doc!.id, provenance: 'manual' as const };
  await db.insert(commitments).values([
    {
      ...base,
      slug: 'road-a',
      wording: 'We will build the Eastern Corridor road.',
      page: 12,
      kind: 'campaign_promise',
      originatingAdministrationSlug: '2013-mahama-i',
      sectorSlug: 'infrastructure',
      finalStatus: 'completed',
      reviewStatus: 'published',
    },
    {
      ...base,
      slug: 'school-b',
      wording: 'We will build 200 community schools.',
      page: 30,
      kind: 'campaign_promise',
      originatingAdministrationSlug: '2013-mahama-i',
      sectorSlug: 'education',
      finalStatus: 'in_progress',
      reviewStatus: 'published',
    },
    {
      ...base,
      slug: 'draft-c',
      wording: 'Draft only.',
      page: 5,
      kind: 'campaign_promise',
      originatingAdministrationSlug: '2013-mahama-i',
      finalStatus: 'not_started',
    },
  ]);
  await db.insert(commitmentStewardships).values([
    {
      commitmentSlug: 'road-a',
      administrationSlug: '2013-mahama-i',
      progressAtStart: 0,
      progressAtEnd: 40,
      status: 'in_progress',
    },
    {
      commitmentSlug: 'road-a',
      administrationSlug: '2017-akufo-addo-i',
      progressAtStart: 40,
      progressAtEnd: 100,
      status: 'completed',
    },
    {
      commitmentSlug: 'school-b',
      administrationSlug: '2013-mahama-i',
      progressAtStart: 0,
      progressAtEnd: 10,
      status: 'in_progress',
    },
    {
      commitmentSlug: 'school-b',
      administrationSlug: '2017-akufo-addo-i',
      progressAtStart: 10,
      progressAtEnd: null,
      status: 'stalled',
    },
  ]);
  await db.insert(commitmentBudgets).values([
    {
      commitmentSlug: 'road-a',
      kind: 'allocated',
      amount: 500_000_000,
      currency: 'GHS',
      fiscalYear: 2015,
      sourceId: src!.id,
      provenance: 'manual',
      reviewStatus: 'published',
    },
  ]);
  await db
    .insert(changeLog)
    .values([
      { entityTable: 'commitments', entityKey: 'road-a', action: 'update', changedBy: 'editor' },
    ]);
});

describe('commitment repository', () => {
  it('never returns drafts', async () => {
    expect((await listCommitments(db)).map((c) => c.slug).sort()).toEqual(['road-a', 'school-b']);
    expect(await getCommitment(db, 'draft-c')).toBeNull();
  });

  it('filters by kind, sector, status, administration and text', async () => {
    expect((await listCommitments(db, { sector: 'education' })).map((c) => c.slug)).toEqual([
      'school-b',
    ]);
    expect((await listCommitments(db, { status: 'completed' })).map((c) => c.slug)).toEqual([
      'road-a',
    ]);
    expect((await listCommitments(db, { q: 'CORRIDOR' })).map((c) => c.slug)).toEqual(['road-a']);
    expect(await listCommitments(db, { administration: '2017-akufo-addo-i' })).toHaveLength(2);
    expect(await listCommitments(db, { kind: 'funded_project' })).toHaveLength(0);
  });

  it('returns the full history with stewardships in government order', async () => {
    const c = await getCommitment(db, 'road-a');
    expect(
      c!.stewardships.map((s) => [s.administrationSlug, s.progressAtStart, s.progressAtEnd]),
    ).toEqual([
      ['2013-mahama-i', 0, 40],
      ['2017-akufo-addo-i', 40, 100],
    ]);
    expect(c!.document).toMatchObject({
      title: '2012 Manifesto',
      page: 12,
      url: 'https://example.org/ndc-2012.pdf',
    });
    expect(c!.budgets).toEqual([
      expect.objectContaining({ amount: 500_000_000, currency: 'GHS', kind: 'allocated' }),
    ]);
    expect(c!.currentHolder?.slug).toBe('2017-akufo-addo-i');
  });

  it('lists outstanding commitments with the government holding them now', async () => {
    const out = await listOutstanding(db);
    expect(out.map((c) => [c.slug, c.currentHolder?.slug])).toEqual([
      ['school-b', '2017-akufo-addo-i'],
    ]);
  });

  it('groups commitments by how an administration came to hold them', async () => {
    const mahama = await listCommitmentsForAdministration(db, '2013-mahama-i');
    expect(mahama.originated.map((c) => c.slug).sort()).toEqual(['road-a', 'school-b']);
    expect(mahama.handedOver.map((c) => c.slug).sort()).toEqual(['road-a', 'school-b']);
    const akufo = await listCommitmentsForAdministration(db, '2017-akufo-addo-i');
    expect(akufo.inherited.map((c) => c.slug).sort()).toEqual(['road-a', 'school-b']);
    expect(akufo.originated).toEqual([]);
  });

  it('lists only documents that may be redistributed as downloadable', async () => {
    const docs = await listPublicDocuments(db);
    expect(docs).toEqual([
      expect.objectContaining({ title: '2012 Manifesto', downloadable: false }),
    ]);
  });

  it('paginates the change log newest first', async () => {
    const page = await listChangeLog(db, { page: 1, perPage: 50 });
    expect(page.total).toBeGreaterThan(1);
    expect(page.items[0]).toMatchObject({ entityTable: 'commitments', entityKey: 'road-a' });
  });
});

describe('public reads never leak unpublished records', () => {
  it('hides links to draft commitments', async () => {
    await db.insert(commitmentLinks).values([
      { fromSlug: 'road-a', toSlug: 'draft-c', kind: 'continues' },
      { fromSlug: 'draft-c', toSlug: 'road-a', kind: 'duplicates' },
      { fromSlug: 'road-a', toSlug: 'school-b', kind: 'supersedes' },
    ]);
    const c = await getCommitment(db, 'road-a');
    expect(c!.links).toEqual([{ slug: 'school-b', kind: 'supersedes', direction: 'to' }]);
  });

  it('uses only published institution names', async () => {
    const [src] = await db.select({ id: sources.id }).from(sources).limit(1);
    await db.insert(institutions).values({ slug: 'mrh', kind: 'ministry' });
    await db.insert(institutionVersions).values([
      {
        institutionSlug: 'mrh',
        name: 'Ministry of Roads and Transport',
        validFrom: '2001-01-07',
        validTo: '2009-01-07',
        sourceId: src!.id,
        provenance: 'manual',
        reviewStatus: 'published',
      },
      {
        institutionSlug: 'mrh',
        name: 'Ministry of Roads and Highways',
        validFrom: '2009-01-07',
        validTo: '2025-01-07',
        sourceId: src!.id,
        provenance: 'manual',
        reviewStatus: 'published',
      },
      {
        institutionSlug: 'mrh',
        name: 'Unreviewed new name',
        validFrom: '2025-01-07',
        validTo: null,
        sourceId: src!.id,
        provenance: 'ai_extracted',
      },
    ]);
    await db
      .insert(commitmentInstitutions)
      .values({ commitmentSlug: 'road-a', institutionSlug: 'mrh' });
    expect((await getCommitment(db, 'road-a'))!.institutions).toEqual([
      { slug: 'mrh', name: 'Ministry of Roads and Highways' },
    ]);
  });
});
