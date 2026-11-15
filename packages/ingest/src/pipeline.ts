import { annualFromYear, type IsoDate } from '@gpip/core';
import { and, type Db, desc, eq, importRuns, indicators, observations } from '@gpip/db';
import type { ImportRunResult, RawPoint, SourceAdapter } from './types.ts';

type Point = {
  periodStart: string;
  periodEnd: string;
  value: number | null;
  estimateType: RawPoint['estimateType'];
};

const fingerprint = (points: Point[]) =>
  points
    .map((p) => `${p.periodStart}|${p.value ?? ''}|${p.estimateType}`)
    .sort()
    .join('\n');

/**
 * Imports every published indicator served by `adapter`. A new vintage (the whole series, dated
 * `today`) is written only when the publisher's figures differ from the latest stored vintage.
 * Each indicator is its own transaction: one failure never leaves partial rows or blocks others.
 */
export async function runImport(
  db: Db,
  adapter: SourceAdapter,
  opts: { today: IsoDate },
): Promise<ImportRunResult> {
  const [run] = await db
    .insert(importRuns)
    .values({ sourceKey: adapter.sourceKey })
    .returning({ id: importRuns.id });
  if (!run) throw new Error('could not record import run');
  const catalogue = await db
    .select()
    .from(indicators)
    .where(
      and(eq(indicators.sourceKey, adapter.sourceKey), eq(indicators.reviewStatus, 'published')),
    );

  const result: ImportRunResult = {
    status: 'ok',
    indicatorsChecked: 0,
    vintagesWritten: 0,
    errors: [],
  };
  for (const ind of catalogue) {
    result.indicatorsChecked++;
    try {
      const raw = await adapter.fetch(ind.seriesCode, {
        today: opts.today,
        defaultEstimateType: ind.estimateType,
      });
      if (raw.length === 0) continue;
      const incoming: Point[] = raw.map((r) => {
        const period = annualFromYear(r.year);
        return {
          periodStart: period.start,
          periodEnd: period.end,
          value: r.value,
          estimateType: r.estimateType,
        };
      });

      const written = await db.transaction(async (tx) => {
        const [latest] = await tx
          .select({ vintage: observations.vintage })
          .from(observations)
          .where(
            and(eq(observations.indicatorCode, ind.code), eq(observations.sourceId, ind.sourceId)),
          )
          .orderBy(desc(observations.vintage))
          .limit(1);
        if (latest) {
          const stored = await tx
            .select({
              periodStart: observations.periodStart,
              periodEnd: observations.periodEnd,
              value: observations.value,
              estimateType: observations.estimateType,
            })
            .from(observations)
            .where(
              and(
                eq(observations.indicatorCode, ind.code),
                eq(observations.sourceId, ind.sourceId),
                eq(observations.vintage, latest.vintage),
              ),
            );
          if (fingerprint(stored) === fingerprint(incoming)) return false;
        }
        await tx.insert(observations).values(
          incoming.map((p) => ({
            ...p,
            indicatorCode: ind.code,
            sourceId: ind.sourceId,
            vintage: opts.today,
          })),
        );
        return true;
      });
      if (written) result.vintagesWritten++;
    } catch (e) {
      result.status = 'failed';
      result.errors.push(`${ind.code}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  await db
    .update(importRuns)
    .set({
      finishedAt: new Date(),
      status: result.status,
      indicatorsChecked: result.indicatorsChecked,
      vintagesWritten: result.vintagesWritten,
      error: result.errors.length ? result.errors.join('\n') : null,
    })
    .where(eq(importRuns.id, run.id));
  return result;
}
