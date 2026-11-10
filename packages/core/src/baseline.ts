import { type Period, toEpochDay } from './period.js';
import type { Tenure } from './tenure.js';

export interface PeriodValue {
  period: Period;
  /** null = not available; never substitute 0. */
  value: number | null;
}

/**
 * The value an administration inherited: the last complete period ending on or before its start.
 * If that period has no value it is returned as-is (null) — we never silently fall back further.
 */
export function inheritedBaseline(t: Tenure, series: readonly PeriodValue[]): PeriodValue | null {
  const start = toEpochDay(t.start);
  let best: PeriodValue | null = null;
  for (const pv of series) {
    const end = toEpochDay(pv.period.end);
    if (end <= start && (!best || end > toEpochDay(best.period.end))) best = pv;
  }
  return best;
}
