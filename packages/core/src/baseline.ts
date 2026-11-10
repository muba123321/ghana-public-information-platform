import {
  type Frequency,
  type Period,
  periodEndingAt,
  periodStartContaining,
  toEpochDay,
} from './period.ts';
import type { Tenure } from './tenure.ts';

export interface PeriodValue {
  period: Period;
  /** null = not available; never substitute 0. */
  value: number | null;
}

/**
 * The value an administration inherited: the last complete reporting period ending on or before
 * its start. If that period is missing from the series, or has no value, it is returned with
 * `value: null` — we never silently fall back to an older period. Returns null only when the
 * series has no data at all before the tenure began.
 */
export function inheritedBaseline(
  t: Tenure,
  series: readonly PeriodValue[],
  frequency: Frequency,
): PeriodValue | null {
  const start = toEpochDay(t.start);
  if (!series.some((pv) => toEpochDay(pv.period.end) <= start)) return null;
  const expected = periodEndingAt(periodStartContaining(t.start, frequency), frequency);
  const match = series.find(
    (pv) => pv.period.start === expected.start && pv.period.end === expected.end,
  );
  return match ?? { period: expected, value: null };
}
