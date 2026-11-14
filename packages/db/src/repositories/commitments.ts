import type { CommitmentKind, CommitmentStatus, Currency, IsoDate, Verification } from '@gpip/core';
import { and, asc, count, desc, eq, ilike, inArray, notInArray, type SQL } from 'drizzle-orm';
import type { Db } from '../client.ts';
import {
  administrations,
  changeLog,
  commitmentBudgets,
  commitmentInstitutions,
  commitmentLinks,
  commitmentStewardships,
  commitments,
  documents,
  editorialNotes,
  institutionVersions,
  progressUpdates,
  sources,
} from '../schema/index.ts';

type AdminRef = { slug: string; name: string };

export interface CommitmentSummary {
  slug: string;
  wording: string;
  kind: CommitmentKind;
  finalStatus: CommitmentStatus;
  sectorSlug: string | null;
  page: number;
  originatingAdministration: AdminRef;
  /** The latest administration in the commitment's history. */
  currentHolder: AdminRef | null;
}

export interface StewardshipView {
  administrationSlug: string;
  administrationName: string;
  startDate: IsoDate;
  endDate: IsoDate | null;
  progressAtStart: number | null;
  progressAtEnd: number | null;
  status: CommitmentStatus;
  notes: string | null;
}

export interface CommitmentDetail extends CommitmentSummary {
  target: string | null;
  targetDeadline: IsoDate | null;
  announcedOn: IsoDate | null;
  document: { id: string; title: string; page: number; publisher: string; url: string };
  institutions: { slug: string; name: string }[];
  budgets: {
    kind: 'allocated' | 'released' | 'spent';
    amount: number;
    currency: Currency;
    fiscalYear: number | null;
    source: string;
  }[];
  stewardships: StewardshipView[];
  progress: {
    date: IsoDate;
    description: string;
    metricValue: number | null;
    verification: Verification;
    source: string;
    url: string;
  }[];
  links: {
    slug: string;
    kind: 'supersedes' | 'continues' | 'duplicates';
    direction: 'to' | 'from';
  }[];
  notes: { kind: string; body: string }[];
}

export interface CommitmentFilters {
  administration?: string;
  sector?: string;
  kind?: CommitmentKind;
  status?: CommitmentStatus;
  /** Institution slug: commitments it is responsible for. */
  institution?: string;
  q?: string;
}

const published = eq(commitments.reviewStatus, 'published');
const CLOSED: CommitmentStatus[] = ['completed', 'discontinued', 'superseded'];

async function stewardshipsFor(db: Db, slugs: string[]): Promise<Map<string, StewardshipView[]>> {
  const map = new Map<string, StewardshipView[]>(slugs.map((s) => [s, []]));
  if (slugs.length === 0) return map;
  const rows = await db
    .select({
      commitmentSlug: commitmentStewardships.commitmentSlug,
      administrationSlug: commitmentStewardships.administrationSlug,
      administrationName: administrations.name,
      startDate: administrations.startDate,
      endDate: administrations.endDate,
      progressAtStart: commitmentStewardships.progressAtStart,
      progressAtEnd: commitmentStewardships.progressAtEnd,
      status: commitmentStewardships.status,
      notes: commitmentStewardships.notes,
    })
    .from(commitmentStewardships)
    .innerJoin(administrations, eq(commitmentStewardships.administrationSlug, administrations.slug))
    .where(inArray(commitmentStewardships.commitmentSlug, slugs))
    .orderBy(asc(administrations.startDate));
  for (const { commitmentSlug, ...s } of rows) map.get(commitmentSlug)?.push(s);
  return map;
}

async function summaries(db: Db, where: SQL | undefined): Promise<CommitmentSummary[]> {
  const rows = await db
    .select({
      slug: commitments.slug,
      wording: commitments.wording,
      kind: commitments.kind,
      finalStatus: commitments.finalStatus,
      sectorSlug: commitments.sectorSlug,
      page: commitments.page,
      originSlug: administrations.slug,
      originName: administrations.name,
    })
    .from(commitments)
    .innerJoin(administrations, eq(commitments.originatingAdministrationSlug, administrations.slug))
    .where(where ? and(published, where) : published)
    .orderBy(asc(administrations.startDate), asc(commitments.slug));
  const steward = await stewardshipsFor(
    db,
    rows.map((r) => r.slug),
  );
  return rows.map(({ originSlug, originName, ...r }) => {
    const last = steward.get(r.slug)?.at(-1);
    return {
      ...r,
      originatingAdministration: { slug: originSlug, name: originName },
      currentHolder: last ? { slug: last.administrationSlug, name: last.administrationName } : null,
    };
  });
}

/** Published commitments, optionally filtered. `administration` matches any government that held it. */
export async function listCommitments(
  db: Db,
  f: CommitmentFilters = {},
): Promise<CommitmentSummary[]> {
  const conds: SQL[] = [];
  if (f.kind) conds.push(eq(commitments.kind, f.kind));
  if (f.sector) conds.push(eq(commitments.sectorSlug, f.sector));
  if (f.status) conds.push(eq(commitments.finalStatus, f.status));
  if (f.q?.trim())
    conds.push(ilike(commitments.wording, `%${f.q.trim().replace(/[%_\\]/g, (c) => `\\${c}`)}%`));
  if (f.institution) {
    const owned = db
      .select({ slug: commitmentInstitutions.commitmentSlug })
      .from(commitmentInstitutions)
      .where(eq(commitmentInstitutions.institutionSlug, f.institution));
    conds.push(inArray(commitments.slug, owned));
  }
  if (f.administration) {
    const held = db
      .select({ slug: commitmentStewardships.commitmentSlug })
      .from(commitmentStewardships)
      .where(eq(commitmentStewardships.administrationSlug, f.administration));
    conds.push(inArray(commitments.slug, held));
  }
  return summaries(db, conds.length ? and(...conds) : undefined);
}

export async function listOutstanding(db: Db): Promise<CommitmentSummary[]> {
  return summaries(db, notInArray(commitments.finalStatus, CLOSED));
}

export async function listCommitmentsForAdministration(
  db: Db,
  slug: string,
): Promise<{
  originated: CommitmentSummary[];
  inherited: CommitmentSummary[];
  handedOver: CommitmentSummary[];
}> {
  const all = await summaries(db, undefined);
  const steward = await stewardshipsFor(
    db,
    all.map((c) => c.slug),
  );
  const held = (c: CommitmentSummary) =>
    steward.get(c.slug)?.some((s) => s.administrationSlug === slug) ?? false;
  const passedOn = (c: CommitmentSummary) => {
    const chain = steward.get(c.slug) ?? [];
    const i = chain.findIndex((s) => s.administrationSlug === slug);
    return i >= 0 && i < chain.length - 1;
  };
  return {
    originated: all.filter((c) => c.originatingAdministration.slug === slug),
    inherited: all.filter((c) => c.originatingAdministration.slug !== slug && held(c)),
    handedOver: all.filter((c) => passedOn(c)),
  };
}

export async function getCommitment(db: Db, slug: string): Promise<CommitmentDetail | null> {
  const [summary] = await summaries(db, eq(commitments.slug, slug));
  if (!summary) return null;
  const [row] = await db
    .select({
      target: commitments.target,
      targetDeadline: commitments.targetDeadline,
      announcedOn: commitments.announcedOn,
      documentId: documents.id,
      documentTitle: documents.title,
      publisher: sources.publisher,
      url: sources.url,
    })
    .from(commitments)
    .innerJoin(documents, eq(commitments.documentId, documents.id))
    .innerJoin(sources, eq(documents.sourceId, sources.id))
    .where(eq(commitments.slug, slug));
  if (!row) return null;

  const [steward, insts, budgets, progress, linksFrom, linksTo, notes] = await Promise.all([
    stewardshipsFor(db, [slug]),
    db
      .select({ slug: institutionVersions.institutionSlug, name: institutionVersions.name })
      .from(commitmentInstitutions)
      .innerJoin(
        institutionVersions,
        eq(commitmentInstitutions.institutionSlug, institutionVersions.institutionSlug),
      )
      .where(
        and(
          eq(commitmentInstitutions.commitmentSlug, slug),
          eq(institutionVersions.reviewStatus, 'published'),
        ),
      )
      .orderBy(desc(institutionVersions.validFrom)),
    db
      .select({
        kind: commitmentBudgets.kind,
        amount: commitmentBudgets.amount,
        currency: commitmentBudgets.currency,
        fiscalYear: commitmentBudgets.fiscalYear,
        source: sources.publisher,
      })
      .from(commitmentBudgets)
      .innerJoin(sources, eq(commitmentBudgets.sourceId, sources.id))
      .where(
        and(
          eq(commitmentBudgets.commitmentSlug, slug),
          eq(commitmentBudgets.reviewStatus, 'published'),
        ),
      )
      .orderBy(asc(commitmentBudgets.fiscalYear)),
    db
      .select({
        date: progressUpdates.date,
        description: progressUpdates.description,
        metricValue: progressUpdates.metricValue,
        verification: progressUpdates.verification,
        source: sources.publisher,
        url: sources.url,
      })
      .from(progressUpdates)
      .innerJoin(sources, eq(progressUpdates.sourceId, sources.id))
      .where(
        and(
          eq(progressUpdates.commitmentSlug, slug),
          eq(progressUpdates.reviewStatus, 'published'),
        ),
      )
      .orderBy(asc(progressUpdates.date)),
    // Links only where the other end is published — a draft's existence is never revealed.
    db
      .select({ slug: commitmentLinks.toSlug, kind: commitmentLinks.kind })
      .from(commitmentLinks)
      .innerJoin(commitments, eq(commitmentLinks.toSlug, commitments.slug))
      .where(and(eq(commitmentLinks.fromSlug, slug), published)),
    db
      .select({ slug: commitmentLinks.fromSlug, kind: commitmentLinks.kind })
      .from(commitmentLinks)
      .innerJoin(commitments, eq(commitmentLinks.fromSlug, commitments.slug))
      .where(and(eq(commitmentLinks.toSlug, slug), published)),
    db
      .select({ kind: editorialNotes.kind, body: editorialNotes.body })
      .from(editorialNotes)
      .where(
        and(
          eq(editorialNotes.subjectType, 'commitment'),
          eq(editorialNotes.subjectKey, slug),
          eq(editorialNotes.reviewStatus, 'published'),
        ),
      ),
  ]);

  // One name per institution: its latest published version (rows arrive newest first).
  const institutions: { slug: string; name: string }[] = [];
  for (const i of insts) if (!institutions.some((x) => x.slug === i.slug)) institutions.push(i);

  return {
    ...summary,
    target: row.target,
    targetDeadline: row.targetDeadline,
    announcedOn: row.announcedOn,
    document: {
      id: row.documentId,
      title: row.documentTitle,
      page: summary.page,
      publisher: row.publisher,
      url: row.url,
    },
    institutions,
    budgets,
    stewardships: steward.get(slug) ?? [],
    progress,
    links: [
      ...linksFrom.map((l) => ({ ...l, direction: 'to' as const })),
      ...linksTo.map((l) => ({ ...l, direction: 'from' as const })),
    ],
    notes,
  };
}

export interface DocumentSummary {
  id: string;
  title: string;
  docType: string;
  publisher: string;
  url: string;
  pages: number | null;
  administration: AdminRef | null;
  /** Only when the source's licence allows redistribution. */
  downloadable: boolean;
}

export async function listPublicDocuments(db: Db): Promise<DocumentSummary[]> {
  const rows = await db
    .select({
      id: documents.id,
      title: documents.title,
      docType: documents.docType,
      publisher: sources.publisher,
      url: sources.url,
      pages: documents.pages,
      adminSlug: administrations.slug,
      adminName: administrations.name,
      downloadable: documents.publicRedistribution,
    })
    .from(documents)
    .innerJoin(sources, eq(documents.sourceId, sources.id))
    .leftJoin(administrations, eq(documents.administrationSlug, administrations.slug))
    .orderBy(desc(documents.archivedAt));
  return rows.map(({ adminSlug, adminName, ...r }) => ({
    ...r,
    administration: adminSlug && adminName ? { slug: adminSlug, name: adminName } : null,
  }));
}

export interface ChangeLogEntry {
  id: number;
  entityTable: string;
  entityKey: string;
  action: 'insert' | 'update' | 'delete';
  changedAt: Date;
}

/** The public corrections log. Reviewer identities are not exposed. */
export async function listChangeLog(
  db: Db,
  opts: { page: number; perPage: number },
): Promise<{ items: ChangeLogEntry[]; total: number }> {
  const page = Math.max(1, Math.floor(opts.page));
  const [items, [totalRow]] = await Promise.all([
    db
      .select({
        id: changeLog.id,
        entityTable: changeLog.entityTable,
        entityKey: changeLog.entityKey,
        action: changeLog.action,
        changedAt: changeLog.changedAt,
      })
      .from(changeLog)
      .orderBy(desc(changeLog.changedAt), desc(changeLog.id))
      .limit(opts.perPage)
      .offset((page - 1) * opts.perPage),
    db.select({ n: count() }).from(changeLog),
  ]);
  return { items, total: totalRow?.n ?? 0 };
}
