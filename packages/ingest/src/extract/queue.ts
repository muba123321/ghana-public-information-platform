import { createHash } from 'node:crypto';
import { type ExtractedCommitment, ExtractionResultSchema } from '@gpip/core';
import {
  commitmentBudgets,
  commitments,
  type Db,
  documents,
  eq,
  extractionRuns,
  sectors,
} from '@gpip/db';

export interface RunMeta {
  model: string;
  promptVersion: string;
  inputTokens?: number;
  outputTokens?: number;
  costUsd?: number;
}

export interface ExtractionOutcome {
  runId: number;
  status: 'ok' | 'failed';
  found: number;
  queued: number;
  error?: string;
}

/** Compares wording ignoring case, spacing and punctuation, so near-identical lines are one commitment. */
export const normaliseWording = (w: string) =>
  w
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export async function recordFailedRun(
  db: Db,
  documentId: string,
  meta: RunMeta,
  error: string,
  found = 0,
): Promise<ExtractionOutcome> {
  const [run] = await db
    .insert(extractionRuns)
    .values({
      documentId,
      ...meta,
      costUsd: meta.costUsd ?? 0,
      status: 'failed',
      itemsFound: found,
      error,
      finishedAt: new Date(),
    })
    .returning({ id: extractionRuns.id });
  return { runId: run?.id ?? -1, status: 'failed', found, queued: 0, error };
}

/**
 * Validates an extraction (from the Claude API or a Claude Code session) and queues the survivors
 * as DRAFT commitments for editor review. Nothing here can publish.
 */
export async function queueExtraction(
  db: Db,
  documentId: string,
  raw: unknown,
  meta: RunMeta,
): Promise<ExtractionOutcome> {
  const parsed = ExtractionResultSchema.safeParse(raw);
  if (!parsed.success)
    return recordFailedRun(
      db,
      documentId,
      meta,
      `Invalid extraction: ${parsed.error.message.slice(0, 500)}`,
    );

  const [doc] = await db.select().from(documents).where(eq(documents.id, documentId));
  if (!doc) return recordFailedRun(db, documentId, meta, 'Unknown document');
  if (!doc.administrationSlug)
    return recordFailedRun(
      db,
      documentId,
      meta,
      'Document has no administration; set it before extracting',
    );

  const knownSectors = new Set(
    (await db.select({ slug: sectors.slug }).from(sectors)).map((s) => s.slug),
  );
  const seen = new Set(
    (
      await db
        .select({ wording: commitments.wording })
        .from(commitments)
        .where(eq(commitments.documentId, documentId))
    ).map((c) => normaliseWording(c.wording)),
  );

  const items = parsed.data.commitments;
  const keep: ExtractedCommitment[] = [];
  for (const c of items) {
    const key = normaliseWording(c.wording);
    if (!key || seen.has(key)) continue;
    if (doc.pages !== null && c.page > doc.pages) continue;
    seen.add(key);
    keep.push(c);
  }

  const adminSlug = doc.administrationSlug;
  return db.transaction(async (tx) => {
    for (const c of keep) {
      const slug = `${adminSlug}-${createHash('sha1')
        .update(`${documentId}:${normaliseWording(c.wording)}`)
        .digest('hex')
        .slice(0, 10)}`;
      await tx.insert(commitments).values({
        slug,
        wording: c.wording,
        documentId,
        page: c.page,
        kind: c.kind,
        originatingAdministrationSlug: adminSlug,
        sectorSlug: c.sectorSlug && knownSectors.has(c.sectorSlug) ? c.sectorSlug : null,
        target:
          [c.target, c.responsibleInstitution && `Responsible: ${c.responsibleInstitution}`]
            .filter(Boolean)
            .join(' — ') || null,
        targetDeadline: c.deadline && ISO_DATE.test(c.deadline) ? c.deadline : null,
        reviewStatus: 'draft',
        provenance: 'ai_extracted',
      });
      if (c.budget) {
        await tx.insert(commitmentBudgets).values({
          commitmentSlug: slug,
          kind: 'allocated',
          amount: c.budget.amount,
          currency: c.budget.currency,
          sourceId: doc.sourceId,
          page: c.page,
          reviewStatus: 'draft',
          provenance: 'ai_extracted',
        });
      }
    }
    const [run] = await tx
      .insert(extractionRuns)
      .values({
        documentId,
        ...meta,
        costUsd: meta.costUsd ?? 0,
        status: 'ok',
        itemsFound: items.length,
        itemsQueued: keep.length,
        finishedAt: new Date(),
      })
      .returning({ id: extractionRuns.id });
    return {
      runId: run?.id ?? -1,
      status: 'ok' as const,
      found: items.length,
      queued: keep.length,
    };
  });
}
