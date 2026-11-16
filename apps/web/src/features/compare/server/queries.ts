import 'server-only';
import { tenureSummary } from '@gpip/core';
import { latestSeries, listAdministrations, listContextEvents, listIndicators } from '@gpip/db';
import { cache } from 'react';
import { todayIso } from '@/lib/format';
import { getDb } from '@/server/db';
import type { CompareSelection } from '../compare-params';
import { buildComparison, compareChoices, type NamedTerm } from '../comparison';

const loadTerms = cache(
  async (): Promise<NamedTerm[]> =>
    (await listAdministrations(await getDb())).map((a) => ({
      slug: a.slug,
      name: a.name,
      start: a.startDate,
      end: a.endDate,
      leaders: a.leaders,
    })),
);

/** Everything the picker offers: governments, people and the topics that have indicators. */
const loadIndicatorList = cache(async () => listIndicators(await getDb()));

export const loadCompareOptions = cache(async () => {
  const [terms, indicators] = await Promise.all([loadTerms(), loadIndicatorList()]);
  const topics = [
    ...new Map(
      indicators.map((i) => [i.sectorSlug, { slug: i.sectorSlug, name: i.sectorName }]),
    ).values(),
  ];
  return { ...compareChoices(terms), topics };
});

export const loadComparison = cache(async (selection: CompareSelection) => {
  const db = await getDb();
  const [terms, indicators, events] = await Promise.all([
    loadTerms(),
    loadIndicatorList(),
    listContextEvents(db),
  ]);
  const inTopic = indicators.filter((i) => i.sectorSlug === selection.topic);
  const series = await latestSeries(
    db,
    inTopic.map((i) => i.code),
  );
  return buildComparison({
    selection,
    terms,
    indicators: inTopic.map((i) => ({
      code: i.code,
      name: i.name,
      unit: i.unit,
      frequency: i.frequency,
      points: series.get(i.code) ?? [],
    })),
    events,
    today: todayIso(),
  });
});

/** Every indicator, in sector order, summarised for one government — the same set for every term. */
export const loadTermIndicators = cache(async (slug: string) => {
  const db = await getDb();
  const [terms, indicators] = await Promise.all([loadTerms(), loadIndicatorList()]);
  const term = terms.find((t) => t.slug === slug);
  if (!term) return [];
  const all = terms.map((t) => ({ slug: t.slug, start: t.start, end: t.end }));
  const series = await latestSeries(
    db,
    indicators.map((i) => i.code),
  );
  const today = todayIso();
  return indicators.map((i) => ({
    code: i.code,
    name: i.name,
    unit: i.unit,
    summary: tenureSummary(
      series.get(i.code) ?? [],
      { slug: term.slug, start: term.start, end: term.end },
      all,
      i.frequency,
      today,
    ),
  }));
});
