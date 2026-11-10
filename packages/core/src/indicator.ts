import { annualPeriod, type IsoDate, type Period } from './period.ts';

/** reported = published measurement; modelled = statistical estimate; projected = forecast. */
export type EstimateType = 'reported' | 'modelled' | 'projected';

export interface ObservationPoint {
  period: Period;
  /** null = not available; never substitute 0. */
  value: number | null;
  estimateType: EstimateType;
  /** Date the publisher's figures were retrieved — each vintage is a complete snapshot. */
  vintage: IsoDate;
}

export function latestVintage(points: readonly ObservationPoint[]): IsoDate | null {
  let latest: IsoDate | null = null;
  for (const p of points) if (latest === null || p.vintage > latest) latest = p.vintage;
  return latest;
}

/** The series exactly as it was published in one vintage, ordered by period. */
export function seriesAt(
  points: readonly ObservationPoint[],
  vintage: IsoDate,
): ObservationPoint[] {
  return points
    .filter((p) => p.vintage === vintage)
    .sort((a, b) => (a.period.start < b.period.start ? -1 : 1));
}

/** Projections are never shown or summarised as actual values. */
export function splitProjected(points: readonly ObservationPoint[]): {
  actual: ObservationPoint[];
  projected: ObservationPoint[];
} {
  return {
    actual: points.filter((p) => p.estimateType !== 'projected'),
    projected: points.filter((p) => p.estimateType === 'projected'),
  };
}

/** Change from the immediately preceding period; null if that period or either value is missing. */
export function yearOnYear(
  points: readonly ObservationPoint[],
): { period: Period; change: number | null }[] {
  const byEnd = new Map(points.map((p) => [p.period.end, p]));
  return points
    .slice()
    .sort((a, b) => (a.period.start < b.period.start ? -1 : 1))
    .slice(1)
    .map((p) => {
      const prev = byEnd.get(p.period.start);
      const change = prev && prev.value !== null && p.value !== null ? p.value - prev.value : null;
      return { period: p.period, change };
    });
}

export function annualFromYear(year: string): Period {
  if (!/^\d{4}$/.test(year)) throw new RangeError(`Not a four-digit year: ${JSON.stringify(year)}`);
  return annualPeriod(Number(year));
}
