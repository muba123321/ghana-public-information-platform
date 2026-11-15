import type { AdministrationKind, IsoDate, ObservationPoint } from '@gpip/core';
import type { RibbonInput } from './timeline';

export interface ChartBand {
  from: string;
  to: string;
  name: string;
  kind: AdministrationKind;
  /** Alternates by position in the full timeline (same as the ribbon) — never by party. */
  tone: 'a' | 'b';
}

export interface ChartModel {
  years: string[];
  /** Reported and modelled values aligned to `years`; null = not available. */
  actual: (number | null)[];
  /** Projections only, aligned to `years`; drawn dashed and labelled. */
  projected: (number | null)[];
  hasProjection: boolean;
  /** Actual values with no neighbour on either side — drawn as dots so they never vanish. */
  isolated: boolean[];
  bands: ChartBand[];
  events: { year: string; title: string }[];
  /** Fewer than half the years have values (e.g. survey data): draw points, not a line. */
  sparse: boolean;
}

const yearOf = (d: IsoDate) => Number(d.slice(0, 4));

export function buildChartModel(
  points: readonly ObservationPoint[],
  administrations: readonly RibbonInput[],
  events: readonly { date: IsoDate; title: string }[],
  today: IsoDate,
): ChartModel {
  const byYear = new Map(points.map((p) => [yearOf(p.period.start), p]));
  const known = [...byYear.keys()].sort((a, b) => a - b);
  const first = known[0];
  const last = known.at(-1);
  if (first === undefined || last === undefined) {
    return {
      years: [],
      actual: [],
      projected: [],
      hasProjection: false,
      isolated: [],
      bands: [],
      events: [],
      sparse: false,
    };
  }

  const years: string[] = [];
  const actual: (number | null)[] = [];
  const projected: (number | null)[] = [];
  for (let y = first; y <= last; y++) {
    const p = byYear.get(y);
    years.push(String(y));
    actual.push(p && p.estimateType !== 'projected' ? p.value : null);
    projected.push(p && p.estimateType === 'projected' ? p.value : null);
  }

  const bands: ChartBand[] = [];
  administrations.forEach((a, i) => {
    const from = Math.max(yearOf(a.startDate), first);
    const to = Math.min(yearOf(a.endDate ?? today), last);
    if (from <= to)
      bands.push({
        from: String(from),
        to: String(to),
        name: a.name,
        kind: a.kind,
        tone: i % 2 === 0 ? 'a' : 'b',
      });
  });

  const withValues = actual.filter((v) => v !== null).length;
  return {
    years,
    actual,
    projected,
    hasProjection: projected.some((v) => v !== null),
    isolated: actual.map(
      (v, i) => v !== null && (actual[i - 1] ?? null) === null && (actual[i + 1] ?? null) === null,
    ),
    bands,
    events: events
      .filter((e) => yearOf(e.date) >= first && yearOf(e.date) <= last)
      .map((e) => ({ year: String(yearOf(e.date)), title: e.title })),
    sparse: withValues < years.length / 2,
  };
}
