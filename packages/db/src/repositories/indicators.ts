import type { EstimateType, IsoDate, ObservationPoint, Period } from '@gpip/core';
import { and, asc, desc, eq, gte, lt, max, min, ne, sql } from 'drizzle-orm';
import type { Db } from '../client.ts';
import { contextEvents, indicators, observations, sectors, sources } from '../schema/index.ts';

export interface IndicatorSummary {
  code: string;
  name: string;
  definition: string;
  unit: string;
  sectorSlug: string;
  sectorName: string;
  estimateType: EstimateType;
  firstYear: number | null;
  lastYear: number | null;
}

export interface IndicatorSeries {
  indicator: IndicatorSummary & {
    methodology: string | null;
    seriesCode: string;
    sourceKey: string;
  };
  source: {
    publisher: string;
    title: string;
    url: string;
    retrievedOn: IsoDate;
    licence: string | null;
  };
  /** The vintage shown; null when nothing has been imported yet. */
  vintage: IsoDate | null;
  /** All available vintages, newest first. */
  vintages: IsoDate[];
  points: ObservationPoint[];
}

export interface ContextEvent {
  date: IsoDate;
  title: string;
  kind: 'international' | 'methodology' | 'domestic' | 'institutional';
  source: { publisher: string; title: string; url: string };
}

const published = eq(indicators.reviewStatus, 'published');

/**
 * Year coverage per indicator: actual (non-projected) values in the latest vintage of the
 * indicator's own source — forecasts and superseded releases never widen the range.
 */
async function coverage(
  db: Db,
  code?: string,
): Promise<Map<string, { firstYear: number; lastYear: number }>> {
  const rows = await db
    .select({
      code: observations.indicatorCode,
      sourceId: observations.sourceId,
      vintage: observations.vintage,
      first: min(observations.periodStart),
      last: max(observations.periodStart),
    })
    .from(observations)
    .innerJoin(
      indicators,
      and(
        eq(observations.indicatorCode, indicators.code),
        eq(observations.sourceId, indicators.sourceId),
      ),
    )
    .where(
      and(
        ne(observations.estimateType, 'projected'),
        code ? eq(observations.indicatorCode, code) : undefined,
      ),
    )
    .groupBy(observations.indicatorCode, observations.sourceId, observations.vintage);
  const latest = new Map<string, (typeof rows)[number]>();
  for (const r of rows) {
    const cur = latest.get(r.code);
    if (!cur || r.vintage > cur.vintage) latest.set(r.code, r);
  }
  return new Map(
    [...latest].map(([c, r]) => [
      c,
      { firstYear: Number(r.first?.slice(0, 4)), lastYear: Number(r.last?.slice(0, 4)) },
    ]),
  );
}

/** Published indicators with the years their current data covers. */
export async function listIndicators(db: Db): Promise<IndicatorSummary[]> {
  const rows = await db
    .select({
      code: indicators.code,
      name: indicators.name,
      definition: indicators.definition,
      unit: indicators.unit,
      sectorSlug: indicators.sectorSlug,
      sectorName: sectors.name,
      estimateType: indicators.estimateType,
    })
    .from(indicators)
    .innerJoin(sectors, eq(indicators.sectorSlug, sectors.slug))
    .where(published)
    .orderBy(asc(indicators.sectorSlug), asc(indicators.name));
  const cov = await coverage(db);
  return rows.map((r) => ({
    ...r,
    firstYear: cov.get(r.code)?.firstYear ?? null,
    lastYear: cov.get(r.code)?.lastYear ?? null,
  }));
}

export async function getIndicatorSeries(
  db: Db,
  code: string,
  opts: { vintage?: IsoDate } = {},
): Promise<IndicatorSeries | null> {
  const [row] = await db
    .select({
      code: indicators.code,
      name: indicators.name,
      definition: indicators.definition,
      unit: indicators.unit,
      sectorSlug: indicators.sectorSlug,
      sectorName: sectors.name,
      estimateType: indicators.estimateType,
      methodology: indicators.methodology,
      seriesCode: indicators.seriesCode,
      sourceKey: indicators.sourceKey,
      sourceId: indicators.sourceId,
      publisher: sources.publisher,
      sourceTitle: sources.title,
      url: sources.url,
      retrievedOn: sources.retrievedOn,
      licence: sources.licence,
    })
    .from(indicators)
    .innerJoin(sources, eq(indicators.sourceId, sources.id))
    .innerJoin(sectors, eq(indicators.sectorSlug, sectors.slug))
    .where(and(published, eq(indicators.code, code)));
  if (!row) return null;

  const vintages = (
    await db
      .selectDistinct({ vintage: observations.vintage })
      .from(observations)
      .where(and(eq(observations.indicatorCode, code), eq(observations.sourceId, row.sourceId)))
      .orderBy(desc(observations.vintage))
  ).map((v) => v.vintage);
  const vintage =
    opts.vintage && vintages.includes(opts.vintage) ? opts.vintage : (vintages[0] ?? null);

  const points: ObservationPoint[] = vintage
    ? (
        await db
          .select()
          .from(observations)
          .where(
            and(
              eq(observations.indicatorCode, code),
              eq(observations.sourceId, row.sourceId),
              eq(observations.vintage, vintage),
            ),
          )
          .orderBy(asc(observations.periodStart))
      ).map((o) => ({
        period: { start: o.periodStart, end: o.periodEnd },
        value: o.value,
        estimateType: o.estimateType,
        vintage: o.vintage,
      }))
    : [];

  const {
    publisher,
    sourceTitle,
    url,
    retrievedOn,
    licence,
    methodology,
    seriesCode,
    sourceKey,
    sourceId: _sourceId,
    ...summary
  } = row;
  const years = points
    .filter((p) => p.estimateType !== 'projected')
    .map((p) => Number(p.period.start.slice(0, 4)));
  return {
    indicator: {
      ...summary,
      methodology,
      seriesCode,
      sourceKey,
      firstYear: years[0] ?? null,
      lastYear: years.at(-1) ?? null,
    },
    source: { publisher, title: sourceTitle, url, retrievedOn, licence },
    vintage,
    vintages,
    points,
  };
}

/** Published context events in date order; `range` is half-open. */
export async function listContextEvents(db: Db, range?: Period): Promise<ContextEvent[]> {
  const where = range
    ? and(
        eq(contextEvents.reviewStatus, 'published'),
        gte(contextEvents.date, range.start),
        lt(contextEvents.date, range.end),
      )
    : eq(contextEvents.reviewStatus, 'published');
  const rows = await db
    .select({
      date: contextEvents.date,
      title: contextEvents.title,
      kind: contextEvents.kind,
      publisher: sources.publisher,
      sourceTitle: sources.title,
      url: sources.url,
    })
    .from(contextEvents)
    .innerJoin(sources, eq(contextEvents.sourceId, sources.id))
    .where(where)
    .orderBy(asc(contextEvents.date), sql`${contextEvents.id}`);
  return rows.map(({ publisher, sourceTitle, url, ...e }) => ({
    ...e,
    source: { publisher, title: sourceTitle, url },
  }));
}
