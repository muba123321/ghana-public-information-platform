/** ISO calendar date, `YYYY-MM-DD`. */
export type IsoDate = string;

/** Half-open period `[start, end)`. */
export interface Period {
  start: IsoDate;
  end: IsoDate;
}

const MS_PER_DAY = 86_400_000;
const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Validates a `YYYY-MM-DD` string that names a real calendar date. */
export function parseIsoDate(s: string): IsoDate {
  const m = ISO_DATE.exec(s);
  if (!m) throw new RangeError(`Invalid ISO date: ${JSON.stringify(s)}`);
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const date = new Date(Date.UTC(y, mo - 1, d));
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== mo - 1 || date.getUTCDate() !== d) {
    throw new RangeError(`Impossible calendar date: ${s}`);
  }
  return s;
}

/** Days since the Unix epoch (UTC), for timezone-independent arithmetic. */
export function toEpochDay(d: IsoDate): number {
  return (
    Date.UTC(Number(d.slice(0, 4)), Number(d.slice(5, 7)) - 1, Number(d.slice(8, 10))) / MS_PER_DAY
  );
}

export function periodDays(p: Period): number {
  return Math.max(0, toEpochDay(p.end) - toEpochDay(p.start));
}

export function overlapDays(a: Period, b: Period): number {
  const start = Math.max(toEpochDay(a.start), toEpochDay(b.start));
  const end = Math.min(toEpochDay(a.end), toEpochDay(b.end));
  return Math.max(0, end - start);
}

export function annualPeriod(year: number): Period {
  return { start: `${year}-01-01`, end: `${year + 1}-01-01` };
}

export type Frequency = 'annual' | 'quarterly' | 'monthly';

const MONTHS: Record<Frequency, number> = { annual: 12, quarterly: 3, monthly: 1 };
const pad = (n: number) => String(n).padStart(2, '0');

/** Start of the reporting period (of the given frequency) that contains `d`. */
export function periodStartContaining(d: IsoDate, frequency: Frequency): IsoDate {
  const step = MONTHS[frequency];
  const month0 = Math.floor((Number(d.slice(5, 7)) - 1) / step) * step;
  return `${d.slice(0, 4)}-${pad(month0 + 1)}-01`;
}

/** The complete reporting period of the given frequency that ends exactly at `boundary`. */
export function periodEndingAt(boundary: IsoDate, frequency: Frequency): Period {
  const total =
    Number(boundary.slice(0, 4)) * 12 + Number(boundary.slice(5, 7)) - 1 - MONTHS[frequency];
  return { start: `${Math.floor(total / 12)}-${pad((total % 12) + 1)}-01`, end: boundary };
}
