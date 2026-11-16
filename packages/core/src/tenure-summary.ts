import { associate } from './attribution.ts';
import { inheritedBaseline } from './baseline.ts';
import type { ObservationPoint } from './indicator.ts';
import { type Frequency, type IsoDate, type Period, periodStartContaining } from './period.ts';
import { type Tenure, tenurePeriod } from './tenure.ts';

/**
 * What one government's term looks like for one indicator. Never a score: these are the figures
 * as published, with the gaps counted. Formulas are explained on the public methodology page.
 */
export interface TenureSummary {
  /** The last complete period before taking office; null when the series starts later. */
  baseline: { year: number; value: number | null } | null;
  /** The last associated period that has a figure, with its year. */
  end: { year: number; value: number } | null;
  /** Mean of the associated figures (missing ones are left out, never counted as 0). */
  average: number | null;
  /** end − baseline, in the indicator's own unit (percentage points for percentages). */
  change: number | null;
  /** Associated periods with a figure, out of all periods associated with the term. */
  coverage: { withValue: number; total: number };
  /** Fewer than half the term's periods have figures. */
  sparse: boolean;
  /** At least one summarised figure is a modelled estimate. */
  modelled: boolean;
  /** Associated periods that another government also held for part of. */
  transitionYears: number[];
  /** Every associated period in order; value null when no figure was published. */
  points: { year: number; value: number | null }[];
}

const MONTHS: Record<Frequency, number> = { annual: 12, quarterly: 3, monthly: 1 };

function addMonths(d: IsoDate, months: number): IsoDate {
  const [y, m] = d.split('-').map(Number) as [number, number];
  const total = y * 12 + (m - 1) + months;
  return `${Math.floor(total / 12)}-${String((total % 12) + 1).padStart(2, '0')}-01`;
}

/** Complete periods (ended on or before today) that overlap the tenure, in order. */
function periodsDuring(t: Tenure, frequency: Frequency, today: IsoDate): Period[] {
  const { start, end } = tenurePeriod(t, today);
  const out: Period[] = [];
  for (let p = periodStartContaining(start, frequency); p < end; ) {
    const next = addMonths(p, MONTHS[frequency]);
    if (next <= today) out.push({ start: p, end: next });
    p = next;
  }
  return out;
}

const yearOf = (d: IsoDate) => Number(d.slice(0, 4));

export function tenureSummary(
  points: readonly ObservationPoint[],
  tenure: Tenure,
  all: readonly Tenure[],
  frequency: Frequency,
  today: IsoDate,
): TenureSummary {
  const series = points.filter((p) => p.estimateType !== 'projected');
  const byStart = new Map(series.map((p) => [p.period.start, p]));

  const held = periodsDuring(tenure, frequency, today)
    .map((period) => ({ period, association: associate(period, all, today) }))
    .filter(({ association }) => association.primary === tenure.slug);

  const summarised = held.map(({ period, association }) => ({
    year: yearOf(period.start),
    point: byStart.get(period.start),
    transition: association.transition,
  }));
  const withValue = summarised.filter(
    (s): s is typeof s & { point: ObservationPoint & { value: number } } =>
      s.point?.value !== null && s.point?.value !== undefined,
  );

  const base = inheritedBaseline(tenure, series, frequency);
  const baseline = base ? { year: yearOf(base.period.start), value: base.value } : null;
  const last = withValue.at(-1);
  const end = last ? { year: last.year, value: last.point.value } : null;
  const average = withValue.length
    ? withValue.reduce((sum, s) => sum + s.point.value, 0) / withValue.length
    : null;
  const change = end && baseline?.value != null ? end.value - baseline.value : null;
  const total = summarised.length;

  return {
    baseline,
    end,
    average,
    change,
    coverage: { withValue: withValue.length, total },
    sparse: total > 0 && withValue.length < total / 2,
    modelled: withValue.some((s) => s.point.estimateType === 'modelled'),
    transitionYears: summarised.filter((s) => s.transition).map((s) => s.year),
    points: summarised.map((s) => ({ year: s.year, value: s.point?.value ?? null })),
  };
}
