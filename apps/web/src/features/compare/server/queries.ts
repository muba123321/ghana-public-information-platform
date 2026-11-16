import 'server-only';
import {
  getIndicatorSeries,
  listAdministrations,
  listContextEvents,
  listIndicators,
} from '@gpip/db';
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
export const loadCompareOptions = cache(async () => {
  const [terms, indicators] = await Promise.all([loadTerms(), listIndicators(await getDb())]);
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
    listIndicators(db),
    listContextEvents(db),
  ]);
  const inTopic = indicators.filter((i) => i.sectorSlug === selection.topic);
  const series = await Promise.all(inTopic.map((i) => getIndicatorSeries(db, i.code)));
  return buildComparison({
    selection,
    terms,
    indicators: inTopic.map((i, k) => ({
      code: i.code,
      name: i.name,
      unit: i.unit,
      frequency: i.frequency,
      points: series[k]?.points ?? [],
    })),
    events,
    today: todayIso(),
  });
});
