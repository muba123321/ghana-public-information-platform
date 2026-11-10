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
