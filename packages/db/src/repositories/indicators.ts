import type { EstimateType, IsoDate, ObservationPoint, Period } from '@gpip/core';
import { and, asc, desc, eq, gte, lt, max, min, sql } from 'drizzle-orm';
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

/** Published indicators with the years their data covers (any vintage). */
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
      first: min(observations.periodStart),
      last: max(observations.periodStart),
    })
    .from(indicators)
    .innerJoin(sectors, eq(indicators.sectorSlug, sectors.slug))
    .leftJoin(observations, eq(observations.indicatorCode, indicators.code))
    .where(published)
    .groupBy(indicators.code, sectors.name)
    .orderBy(asc(indicators.sectorSlug), asc(indicators.name));
  return rows.map(({ first, last, ...r }) => ({
    ...r,
    firstYear: first ? Number(first.slice(0, 4)) : null,
    lastYear: last ? Number(last.slice(0, 4)) : null,
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
      .where(eq(observations.indicatorCode, code))
      .orderBy(desc(observations.vintage))
  ).map((v) => v.vintage);
  const vintage =
    opts.vintage && vintages.includes(opts.vintage) ? opts.vintage : (vintages[0] ?? null);

  const points: ObservationPoint[] = vintage
    ? (
        await db
          .select()
          .from(observations)
          .where(and(eq(observations.indicatorCode, code), eq(observations.vintage, vintage)))
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
    ...summary
  } = row;
  const years = points.map((p) => Number(p.period.start.slice(0, 4)));
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
