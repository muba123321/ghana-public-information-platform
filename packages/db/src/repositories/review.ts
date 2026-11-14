import {
  COMMITMENT_KINDS,
  COMMITMENT_STATUSES,
  type CommitmentKind,
  type CommitmentStatus,
  type IsoDate,
  type StewardshipInput,
  validateStewardshipChain,
} from '@gpip/core';
import { and, asc, count, desc, eq, gte, inArray } from 'drizzle-orm';
import type { Db } from '../client.ts';
import {
  administrations,
  changeLog,
  commitmentBudgets,
  commitmentStewardships,
  commitments,
  correctionReports,
  documents,
  extractionRuns,
  sectors,
} from '../schema/index.ts';

/** An edit the editor cannot save; `message` is safe to show in the admin UI. */
export class ReviewError extends Error {}

const QUEUE = inArray(commitments.reviewStatus, ['draft', 'in_review']);

export interface ReviewItem {
  slug: string;
  wording: string;
  page: number;
  kind: CommitmentKind;
  sectorSlug: string | null;
  target: string | null;
  targetDeadline: IsoDate | null;
  originatingAdministrationSlug: string;
  finalStatus: CommitmentStatus;
  provenance: string;
  documentId: string;
  documentTitle: string;
  documentPages: number | null;
}

export interface CommitmentEdit {
  wording: string;
  page: number;
  kind: CommitmentKind;
  sectorSlug: string | null;
  originatingAdministrationSlug: string;
  finalStatus: CommitmentStatus;
  target: string | null;
  targetDeadline: IsoDate | null;
}

export interface StewardshipEdit extends StewardshipInput {
  status: CommitmentStatus;
  notes?: string | null;
}

export async function reviewCounts(db: Db): Promise<{ commitments: number; corrections: number }> {
  const [[c], [r]] = await Promise.all([
    db.select({ n: count() }).from(commitments).where(QUEUE),
    db.select({ n: count() }).from(correctionReports).where(eq(correctionReports.status, 'new')),
  ]);
  return { commitments: c?.n ?? 0, corrections: r?.n ?? 0 };
}

function itemQuery(db: Db) {
  return db
    .select({
      slug: commitments.slug,
      wording: commitments.wording,
      page: commitments.page,
      kind: commitments.kind,
      sectorSlug: commitments.sectorSlug,
      target: commitments.target,
      targetDeadline: commitments.targetDeadline,
      originatingAdministrationSlug: commitments.originatingAdministrationSlug,
      finalStatus: commitments.finalStatus,
      provenance: commitments.provenance,
      documentId: documents.id,
      documentTitle: documents.title,
      documentPages: documents.pages,
    })
    .from(commitments)
    .innerJoin(documents, eq(commitments.documentId, documents.id));
}

export async function listReviewQueue(
  db: Db,
  opts: { documentId?: string } = {},
): Promise<ReviewItem[]> {
  return itemQuery(db)
    .where(opts.documentId ? and(QUEUE, eq(commitments.documentId, opts.documentId)) : QUEUE)
    .orderBy(asc(documents.title), asc(commitments.page), asc(commitments.slug));
}

export async function getReviewItem(db: Db, slug: string): Promise<ReviewItem | null> {
  const [item] = await itemQuery(db).where(eq(commitments.slug, slug));
  return item ?? null;
}

async function validateEdit(
  db: Db,
  edit: CommitmentEdit,
  documentPages: number | null,
): Promise<void> {
  const problems: string[] = [];
  if (!edit.wording.trim()) problems.push('Wording cannot be empty.');
  if (
    !Number.isInteger(edit.page) ||
    edit.page < 1 ||
    (documentPages !== null && edit.page > documentPages)
  ) {
    problems.push(`Page must be between 1 and ${documentPages ?? 'the last page'}.`);
  }
  if (!COMMITMENT_KINDS.includes(edit.kind)) problems.push('Unknown kind.');
  if (!COMMITMENT_STATUSES.includes(edit.finalStatus)) problems.push('Unknown status.');
  const [admin] = await db
    .select({ slug: administrations.slug })
    .from(administrations)
    .where(eq(administrations.slug, edit.originatingAdministrationSlug));
  if (!admin) problems.push('Unknown originating administration.');
  if (edit.sectorSlug) {
    const [sector] = await db
      .select({ slug: sectors.slug })
      .from(sectors)
      .where(eq(sectors.slug, edit.sectorSlug));
    if (!sector) problems.push('Unknown sector.');
  }
  if (problems.length) throw new ReviewError(problems.join(' '));
}

/** Publishes a reviewed commitment with the editor's corrections. Audited; idempotent. */
export async function approveCommitment(
  db: Db,
  slug: string,
  edit: CommitmentEdit,
  reviewer: string,
): Promise<void> {
  const item = await getReviewItem(db, slug);
  if (!item) throw new ReviewError('Commitment not found.');
  const [before] = await db.select().from(commitments).where(eq(commitments.slug, slug));
  if (!before || before.reviewStatus === 'published') return;
  await validateEdit(db, edit, item.documentPages);

  await db.transaction(async (tx) => {
    const now = new Date();
    const fields = {
      ...edit,
      wording: edit.wording.trim(),
      reviewStatus: 'published' as const,
      reviewedBy: reviewer,
      reviewedAt: now,
      updatedAt: now,
    };
    await tx.update(commitments).set(fields).where(eq(commitments.slug, slug));
    await tx
      .update(commitmentBudgets)
      .set({ reviewStatus: 'published', reviewedBy: reviewer, reviewedAt: now })
      .where(
        and(
          eq(commitmentBudgets.commitmentSlug, slug),
          eq(commitmentBudgets.reviewStatus, 'draft'),
        ),
      );
    const [held] = await tx
      .select({ n: count() })
      .from(commitmentStewardships)
      .where(eq(commitmentStewardships.commitmentSlug, slug));
    if (!held?.n) {
      await tx.insert(commitmentStewardships).values({
        commitmentSlug: slug,
        administrationSlug: edit.originatingAdministrationSlug,
        progressAtStart: null,
        progressAtEnd: null,
        status: edit.finalStatus,
      });
    }
    await tx.insert(changeLog).values({
      entityTable: 'commitments',
      entityKey: slug,
      action: 'update',
      before,
      after: { ...before, ...fields },
      changedBy: reviewer,
    });
  });
}

export async function rejectCommitment(
  db: Db,
  slug: string,
  reason: string,
  reviewer: string,
): Promise<void> {
  const [before] = await db.select().from(commitments).where(eq(commitments.slug, slug));
  if (!before) throw new ReviewError('Commitment not found.');
  if (before.reviewStatus === 'rejected') return;
  const now = new Date();
  await db.transaction(async (tx) => {
    await tx
      .update(commitments)
      .set({ reviewStatus: 'rejected', reviewedBy: reviewer, reviewedAt: now, updatedAt: now })
      .where(eq(commitments.slug, slug));
    await tx.insert(changeLog).values({
      entityTable: 'commitments',
      entityKey: slug,
      action: 'update',
      before,
      after: { reviewStatus: 'rejected', reason },
      changedBy: reviewer,
    });
  });
}

/** Replaces a commitment's history if the chain is valid; returns problems otherwise (nothing saved). */
export async function saveStewardships(
  db: Db,
  slug: string,
  chain: readonly StewardshipEdit[],
  reviewer: string,
): Promise<string[]> {
  const [c] = await db
    .select({ origin: commitments.originatingAdministrationSlug })
    .from(commitments)
    .where(eq(commitments.slug, slug));
  if (!c) return ['Commitment not found.'];
  const timeline = (
    await db
      .select({
        slug: administrations.slug,
        start: administrations.startDate,
        end: administrations.endDate,
      })
      .from(administrations)
      .orderBy(asc(administrations.startDate))
  ).map((t) => ({ slug: t.slug, start: t.start, end: t.end }));
  const problems = validateStewardshipChain(chain, c.origin, timeline);
  if (problems.length) return problems;

  await db.transaction(async (tx) => {
    const before = await tx
      .select()
      .from(commitmentStewardships)
      .where(eq(commitmentStewardships.commitmentSlug, slug));
    await tx.delete(commitmentStewardships).where(eq(commitmentStewardships.commitmentSlug, slug));
    await tx
      .insert(commitmentStewardships)
      .values(chain.map((l) => ({ commitmentSlug: slug, ...l, notes: l.notes ?? null })));
    await tx.insert(changeLog).values({
      entityTable: 'commitment_stewardships',
      entityKey: slug,
      action: 'update',
      before,
      after: chain,
      changedBy: reviewer,
    });
  });
  return [];
}

export type CorrectionStatus = 'new' | 'reviewed' | 'actioned' | 'dismissed';

export async function listCorrectionReports(db: Db, status?: CorrectionStatus) {
  return db
    .select()
    .from(correctionReports)
    .where(status ? eq(correctionReports.status, status) : undefined)
    .orderBy(desc(correctionReports.createdAt));
}

export async function setCorrectionStatus(
  db: Db,
  id: number,
  status: CorrectionStatus,
  reviewer: string,
): Promise<void> {
  const [before] = await db.select().from(correctionReports).where(eq(correctionReports.id, id));
  if (!before) throw new ReviewError('Report not found.');
  await db.transaction(async (tx) => {
    await tx.update(correctionReports).set({ status }).where(eq(correctionReports.id, id));
    await tx.insert(changeLog).values({
      entityTable: 'correction_reports',
      entityKey: String(id),
      action: 'update',
      before: { status: before.status },
      after: { status },
      changedBy: reviewer,
    });
  });
}

export interface AdminDocument {
  id: string;
  title: string;
  docType: string;
  pages: number | null;
  administrationSlug: string | null;
  publicRedistribution: boolean;
  /** Drafts from this document waiting for review. */
  waiting: number;
  latestRun: {
    status: string;
    model: string;
    itemsFound: number;
    itemsQueued: number;
    costUsd: number | null;
    error: string | null;
    finishedAt: Date | null;
  } | null;
}

export async function listDocumentsForAdmin(db: Db): Promise<AdminDocument[]> {
  const docs = await db.select().from(documents).orderBy(desc(documents.archivedAt));
  const waiting = await db
    .select({ documentId: commitments.documentId, n: count() })
    .from(commitments)
    .where(QUEUE)
    .groupBy(commitments.documentId);
  const runs = await db
    .select()
    .from(extractionRuns)
    .orderBy(desc(extractionRuns.startedAt), desc(extractionRuns.id));
  return docs.map((d) => {
    const run = runs.find((r) => r.documentId === d.id);
    return {
      id: d.id,
      title: d.title,
      docType: d.docType,
      pages: d.pages,
      administrationSlug: d.administrationSlug,
      publicRedistribution: d.publicRedistribution,
      waiting: waiting.find((w) => w.documentId === d.id)?.n ?? 0,
      latestRun: run
        ? {
            status: run.status,
            model: run.model,
            itemsFound: run.itemsFound,
            itemsQueued: run.itemsQueued,
            costUsd: run.costUsd,
            error: run.error,
            finishedAt: run.finishedAt,
          }
        : null,
    };
  });
}

export async function getDocumentFile(
  db: Db,
  id: string,
): Promise<{ storageKey: string; mime: string; title: string } | null> {
  const [d] = await db
    .select({ storageKey: documents.storageKey, mime: documents.mime, title: documents.title })
    .from(documents)
    .where(eq(documents.id, id));
  return d ?? null;
}

export interface CorrectionInput {
  pageUrl: string;
  message: string;
  evidenceUrl: string | null;
  contact: string | null;
}

const MAX_REPORTS_PER_HOUR = 5;

/**
 * Stores a public "report an error" submission for editors. Validated and rate-limited per sender
 * (salted IP hash). Never published automatically.
 */
export async function submitCorrection(
  db: Db,
  input: CorrectionInput,
  ctx: { ipHash: string; now?: Date },
): Promise<{ ok: true } | { ok: false; error: string }> {
  const message = input.message.trim();
  const contact = input.contact?.trim() || null;
  const evidenceUrl = input.evidenceUrl?.trim() || null;
  if (!message) return { ok: false, error: 'Please describe what looks wrong.' };
  if (message.length > 4000)
    return { ok: false, error: 'Please keep the description under 4,000 characters.' };
  if (!input.pageUrl.startsWith('/') || input.pageUrl.startsWith('//'))
    return { ok: false, error: 'Unknown page.' };
  if (evidenceUrl && !/^https?:\/\//i.test(evidenceUrl))
    return { ok: false, error: 'The evidence link must start with https:// or http://' };
  if (contact && contact.length > 200)
    return { ok: false, error: 'Please keep the contact under 200 characters.' };

  const now = ctx.now ?? new Date();
  const since = new Date(now.getTime() - 60 * 60 * 1000);
  const [recent] = await db
    .select({ n: count() })
    .from(correctionReports)
    .where(and(eq(correctionReports.ipHash, ctx.ipHash), gte(correctionReports.createdAt, since)));
  if ((recent?.n ?? 0) >= MAX_REPORTS_PER_HOUR) {
    return {
      ok: false,
      error: 'Too many reports from this connection in the last hour. Please try again later.',
    };
  }
  await db.insert(correctionReports).values({
    pageUrl: input.pageUrl.slice(0, 500),
    message,
    evidenceUrl: evidenceUrl?.slice(0, 1000) ?? null,
    contact,
    ipHash: ctx.ipHash,
    createdAt: now,
  });
  return { ok: true };
}
