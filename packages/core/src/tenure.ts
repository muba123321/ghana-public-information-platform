import type { IsoDate, Period } from './period.ts';

/** An administration's time in office; `end: null` means it is the incumbent. */
export interface Tenure {
  slug: string;
  start: IsoDate;
  end: IsoDate | null;
}

export function tenurePeriod(t: Tenure, today: IsoDate): Period {
  return { start: t.start, end: t.end ?? today };
}
