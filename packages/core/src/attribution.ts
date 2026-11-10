import type { IsoDate } from './period.js';
import { overlapDays, type Period, toEpochDay } from './period.js';
import { type Tenure, tenurePeriod } from './tenure.js';

export interface Association {
  /** Tenure holding the most days of the period (ties → earlier tenure); null if none. */
  primary: string | null;
  /** True when more than one tenure overlaps the period. */
  transition: boolean;
  /** Overlapping tenures and their days within the period, ordered by tenure start. */
  shares: { slug: string; days: number }[];
}

/**
 * Associates a reporting period with the administration(s) in office during it.
 * This records who was in office — it never implies the administration caused the outcome.
 */
export function associate(period: Period, tenures: readonly Tenure[], today: IsoDate): Association {
  const shares = [...tenures]
    .sort((a, b) => toEpochDay(a.start) - toEpochDay(b.start))
    .map((t) => ({ slug: t.slug, days: overlapDays(period, tenurePeriod(t, today)) }))
    .filter((s) => s.days > 0);

  let primary: { slug: string; days: number } | undefined;
  for (const s of shares) if (!primary || s.days > primary.days) primary = s;

  return { primary: primary?.slug ?? null, transition: shares.length > 1, shares };
}
