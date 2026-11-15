import { type AdministrationKind, type IsoDate, periodDays, toEpochDay } from '@gpip/core';
import { yearRange } from './format';

export interface RibbonInput {
  slug: string;
  name: string;
  kind: AdministrationKind;
  startDate: IsoDate;
  endDate: IsoDate | null;
}

export interface RibbonSegment extends RibbonInput {
  years: string;
  /** Left offset and width as percentages of the whole span. */
  startPct: number;
  widthPct: number;
}

/** One segment per administration, sized by days in office (incumbent runs to `today`). */
export function ribbonSegments(items: readonly RibbonInput[], today: IsoDate): RibbonSegment[] {
  const first = items[0];
  const last = items.at(-1);
  if (!first || !last) return [];
  const spanStart = toEpochDay(first.startDate);
  const total = toEpochDay(last.endDate ?? today) - spanStart;
  return items.map((a) => ({
    ...a,
    years: yearRange(a.startDate, a.endDate),
    startPct: ((toEpochDay(a.startDate) - spanStart) / total) * 100,
    widthPct: (periodDays({ start: a.startDate, end: a.endDate ?? today }) / total) * 100,
  }));
}

/** Axis marks at every `step`-th year that falls within [start, end]. */
export function ribbonTicks(
  start: IsoDate,
  end: IsoDate,
  step: number,
): { year: number; pct: number }[] {
  const s = toEpochDay(start);
  const total = toEpochDay(end) - s;
  const firstYear = Math.ceil(Number(start.slice(0, 4)) / step) * step;
  const ticks: { year: number; pct: number }[] = [];
  for (let y = firstYear; ; y += step) {
    const d = toEpochDay(`${y}-01-01`);
    if (d < s) continue;
    if (d > s + total) break;
    ticks.push({ year: y, pct: ((d - s) / total) * 100 });
  }
  return ticks;
}

const KINDS: readonly AdministrationKind[] = ['civilian', 'military', 'transitional'];

export function parseKind(value: string | undefined): AdministrationKind | undefined {
  return KINDS.find((k) => k === value);
}

/** Directory filter; an absent or unknown kind shows everything. */
export function filterByKind<T extends { kind: AdministrationKind }>(
  items: readonly T[],
  kind: string | undefined,
): T[] {
  const k = parseKind(kind);
  return k ? items.filter((a) => a.kind === k) : [...items];
}

export const KIND_LABEL: Record<AdministrationKind, string> = {
  civilian: 'Civilian government',
  military: 'Military government',
  transitional: 'Transitional government',
};
