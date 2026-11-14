import { eq } from 'drizzle-orm';
import { beforeEach, describe, expect, it } from 'vitest';
import type { Db } from '../client.ts';
import {
  changeLog,
  commitmentStewardships,
  commitments,
  correctionReports,
  documents,
  extractionRuns,
  sources,
} from '../schema/index.ts';
import { seed } from '../seed/seed.ts';
import { createTestDb } from '../testing.ts';
import { getCommitment, listChangeLog, listCommitments } from './commitments.ts';
import {
  approveCommitment,
  getReviewItem,
  listCorrectionReports,
  listDocumentsForAdmin,
  listReviewQueue,
  ReviewError,
  rejectCommitment,
  reviewCounts,
  saveStewardships,
  setCorrectionStatus,
  submitCorrection,
} from './review.ts';

let db: Db;
let docId: string;

beforeEach(async () => {
  db = await createTestDb();
  await seed(db);
  const [src] = await db
    .insert(sources)
    .values({
      publisher: 'NPP',
      title: 'Manifesto 2016',
      url: 'https://example.org/m.pdf',
      sourceType: 'manifesto',
      retrievedOn: '2026-11-14',
    })
    .returning();
  const [doc] = await db
    .insert(documents)
    .values({
      sourceId: src!.id,
      title: 'Manifesto 2016',
      docType: 'manifesto',
      administrationSlug: '2017-akufo-addo-i',
      pages: 50,
      mime: 'application/pdf',
      sha256: 'b'.repeat(64),
      storageKey: 'documents/b.pdf',
      bytes: 1,
    })
    .returning();
  docId = doc!.id;
  const draft = {
    documentId: docId,
    kind: 'campaign_promise' as const,
    originatingAdministrationSlug: '2017-akufo-addo-i',
    provenance: 'ai_extracted' as const,
  };
  await db.insert(commitments).values([
    { ...draft, slug: 'd1', wording: 'Free senior high school.', page: 20 },
    { ...draft, slug: 'd2', wording: 'One district, one factory.', page: 12 },
  ]);
  await db.insert(correctionReports).values({
    pageUrl: '/history/indicators/inflation',
    message: '2016 value looks wrong',
    ipHash: 'h',
  });
});

const edit = {
  wording: 'Free senior high school.',
  page: 20,
  kind: 'campaign_promise' as const,
  sectorSlug: 'education',
  originatingAdministrationSlug: '2017-akufo-addo-i',
  finalStatus: 'in_progress' as const,
  target: null,
  targetDeadline: null,
};

describe('review queue', () => {
  it('counts and lists drafts with their source page', async () => {
    expect(await reviewCounts(db)).toEqual({ commitments: 2, corrections: 1 });
    const q = await listReviewQueue(db);
    expect(q.map((i) => i.slug)).toEqual(['d2', 'd1']);
    expect(await getReviewItem(db, 'd1')).toMatchObject({
      documentId: docId,
      page: 20,
      documentPages: 50,
      provenance: 'ai_extracted',
    });
  });

  it('approving publishes, records the reviewer and logs before/after', async () => {
    await approveCommitment(db, 'd1', edit, 'muba123321');
    const c = await getCommitment(db, 'd1');
    expect(c).toMatchObject({
      sectorSlug: 'education',
      finalStatus: 'in_progress',
      currentHolder: { slug: '2017-akufo-addo-i' },
    });
    const [row] = await db.select().from(commitments).where(eq(commitments.slug, 'd1'));
    expect(row).toMatchObject({ reviewStatus: 'published', reviewedBy: 'muba123321' });
    const [log] = await db.select().from(changeLog).where(eq(changeLog.entityKey, 'd1'));
    expect(log).toMatchObject({
      entityTable: 'commitments',
      action: 'update',
      changedBy: 'muba123321',
    });
    expect((log!.before as { reviewStatus: string }).reviewStatus).toBe('draft');
    expect(await reviewCounts(db)).toMatchObject({ commitments: 1 });
  });

  it('approving twice changes nothing the second time', async () => {
    await approveCommitment(db, 'd1', edit, 'muba123321');
    await approveCommitment(db, 'd1', edit, 'muba123321');
    expect(await db.$count(changeLog, eq(changeLog.entityKey, 'd1'))).toBe(1);
  });

  it.each([
    [{ ...edit, wording: '  ' }, /wording/i],
    [{ ...edit, page: 0 }, /page/i],
    [{ ...edit, page: 51 }, /page/i],
    [{ ...edit, kind: 'promise' }, /kind/i],
    [{ ...edit, originatingAdministrationSlug: 'nope' }, /administration/i],
    [{ ...edit, sectorSlug: 'space' }, /sector/i],
  ])('rejects an invalid edit without changing anything (%#)', async (bad, msg) => {
    await expect(approveCommitment(db, 'd1', bad as typeof edit, 'muba123321')).rejects.toThrow(
      msg,
    );
    await expect(
      approveCommitment(db, 'd1', bad as typeof edit, 'muba123321'),
    ).rejects.toBeInstanceOf(ReviewError);
    expect(await listCommitments(db)).toHaveLength(0);
  });

  it('rejecting keeps the record for audit but out of the queue and the public site', async () => {
    await rejectCommitment(db, 'd2', 'Not a checkable commitment', 'muba123321');
    expect((await listReviewQueue(db)).map((i) => i.slug)).toEqual(['d1']);
    expect(await getCommitment(db, 'd2')).toBeNull();
    const [log] = await db.select().from(changeLog).where(eq(changeLog.entityKey, 'd2'));
    expect((log!.after as { reason: string }).reason).toBe('Not a checkable commitment');
  });

  it('saves a valid stewardship chain and refuses an invalid one', async () => {
    await approveCommitment(db, 'd1', edit, 'muba123321');
    const bad = await saveStewardships(
      db,
      'd1',
      [
        {
          administrationSlug: '2021-akufo-addo-ii',
          progressAtStart: 0,
          progressAtEnd: 50,
          status: 'in_progress',
        },
      ],
      'muba123321',
    );
    expect(bad).toEqual([expect.stringMatching(/originating administration/)]);
    const good = await saveStewardships(
      db,
      'd1',
      [
        {
          administrationSlug: '2017-akufo-addo-i',
          progressAtStart: 0,
          progressAtEnd: 60,
          status: 'in_progress',
        },
        {
          administrationSlug: '2021-akufo-addo-ii',
          progressAtStart: 60,
          progressAtEnd: 90,
          status: 'in_progress',
        },
      ],
      'muba123321',
    );
    expect(good).toEqual([]);
    const rows = await db
      .select()
      .from(commitmentStewardships)
      .where(eq(commitmentStewardships.commitmentSlug, 'd1'));
    expect(rows).toHaveLength(2);
  });

  it('tracks correction reports through review', async () => {
    const [r] = await listCorrectionReports(db, 'new');
    await setCorrectionStatus(db, r!.id, 'actioned', 'muba123321');
    expect(await listCorrectionReports(db, 'new')).toHaveLength(0);
    expect(await reviewCounts(db)).toMatchObject({ corrections: 0 });
  });
});

describe('documents for the admin screen', () => {
  it('lists every archived document with its queue size and latest extraction run', async () => {
    await db.insert(extractionRuns).values({
      documentId: docId,
      model: 'claude-code-session',
      promptVersion: 'v1',
      status: 'ok',
      itemsFound: 2,
      itemsQueued: 2,
    });
    const [d] = await listDocumentsForAdmin(db);
    expect(d).toMatchObject({
      id: docId,
      title: 'Manifesto 2016',
      pages: 50,
      waiting: 2,
      latestRun: { status: 'ok', itemsQueued: 2, model: 'claude-code-session' },
    });
  });
});

describe('public corrections log', () => {
  it('shows published changes but never drafts, rejections or private error reports', async () => {
    await approveCommitment(db, 'd1', edit, 'muba123321');
    await rejectCommitment(db, 'd2', 'Not checkable', 'muba123321');
    const [r] = await listCorrectionReports(db, 'new');
    await setCorrectionStatus(db, r!.id, 'reviewed', 'muba123321');
    const { items } = await listChangeLog(db, { page: 1, perPage: 500 });
    const keys = items.map((i) => `${i.entityTable}:${i.entityKey}`);
    expect(keys).toContain('commitments:d1');
    expect(keys).not.toContain('commitments:d2');
    expect(keys.some((k) => k.startsWith('correction_reports:'))).toBe(false);
    expect(items.every((i) => !('changedBy' in i))).toBe(true);
  });
});

describe('submitCorrection', () => {
  const input = {
    pageUrl: '/history/indicators/inflation',
    message: 'The 2016 value differs from the GSS release.',
    evidenceUrl: 'https://statsghana.gov.gh/x',
    contact: null,
  };
  const now = new Date('2026-11-14T10:00:00Z');

  it('stores a valid report as new', async () => {
    expect(await submitCorrection(db, input, { ipHash: 'abc', now })).toEqual({ ok: true });
    expect(
      (await listCorrectionReports(db, 'new')).some(
        (r) => r.message === input.message && r.ipHash === 'abc',
      ),
    ).toBe(true);
  });

  it.each([
    [{ ...input, message: '   ' }, /describe/i],
    [{ ...input, message: 'x'.repeat(4001) }, /4,000/],
    [{ ...input, pageUrl: 'https://evil.example/' }, /page/i],
    [{ ...input, pageUrl: '/\\evil.example' }, /page/i],
    [{ ...input, evidenceUrl: 'javascript:alert(1)' }, /evidence/i],
    [{ ...input, contact: 'x'.repeat(201) }, /contact/i],
  ])('refuses invalid input (%#)', async (bad, msg) => {
    const r = await submitCorrection(db, bad, { ipHash: 'abc', now });
    expect(r.ok).toBe(false);
    expect(r.ok === false && r.error).toMatch(msg);
  });

  it('allows 5 reports per hour from one sender, then refuses', async () => {
    for (let i = 0; i < 5; i++)
      expect((await submitCorrection(db, input, { ipHash: 'spammer', now })).ok).toBe(true);
    const sixth = await submitCorrection(db, input, { ipHash: 'spammer', now });
    expect(sixth).toEqual({ ok: false, error: expect.stringMatching(/too many/i) });
    expect(
      (
        await submitCorrection(db, input, {
          ipHash: 'spammer',
          now: new Date('2026-11-14T11:01:00Z'),
        })
      ).ok,
    ).toBe(true);
  });
});
