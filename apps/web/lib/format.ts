import type { IsoDate } from '@gpip/core';

const fmt = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
});

export function formatDate(d: IsoDate): string {
  return fmt.format(new Date(`${d}T00:00:00Z`));
}

/** "7 Jan 2025 – present" for an open range. */
export function formatRange(start: IsoDate, end: IsoDate | null): string {
  return `${formatDate(start)} – ${end ? formatDate(end) : 'present'}`;
}

export function yearRange(start: IsoDate, end: IsoDate | null): string {
  const a = start.slice(0, 4);
  if (!end) return `${a}–present`;
  const b = end.slice(0, 4);
  return a === b ? a : `${a}–${b}`;
}

/** Today's date in Ghana (GMT, no daylight saving). */
export function todayIso(): IsoDate {
  return new Date().toISOString().slice(0, 10);
}

function monthsBetween(a: IsoDate, b: IsoDate): number {
  const [y1, m1, d1] = a.split('-').map(Number) as [number, number, number];
  const [y2, m2, d2] = b.split('-').map(Number) as [number, number, number];
  return (y2 - y1) * 12 + (m2 - m1) - (d2 < d1 ? 1 : 0);
}

export function fullYearsBetween(a: IsoDate, b: IsoDate): number {
  return Math.floor(monthsBetween(a, b) / 12);
}

const plural = (n: number, unit: string) => `${n} ${unit}${n === 1 ? '' : 's'}`;

const NOT_YET = 'Not yet in office';

/** Profile chip text: "4 years in office", or "Not yet in office" before the start date. */
export function timeInOffice(start: IsoDate, end: IsoDate | null, today: IsoDate): string {
  const d = formatDuration(start, end, today);
  return d === NOT_YET ? d : `${d} in office`;
}

/** "4 years", "3 years, 6 months", "3 months", "24 days" — or "Not yet in office" before the start. */
export function formatDuration(start: IsoDate, end: IsoDate | null, today: IsoDate): string {
  const stop = end ?? today;
  if (stop <= start) return NOT_YET;
  const months = monthsBetween(start, stop);
  if (months < 1) {
    const days = Math.round((Date.parse(stop) - Date.parse(start)) / 86_400_000);
    return plural(days, 'day');
  }
  const years = Math.floor(months / 12);
  const rest = months % 12;
  if (years === 0) return plural(rest, 'month');
  return rest === 0 ? plural(years, 'year') : `${plural(years, 'year')}, ${plural(rest, 'month')}`;
}
