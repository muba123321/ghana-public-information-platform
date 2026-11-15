import { describe, expect, it } from 'vitest';
import { filterByKind, ribbonSegments, ribbonTicks } from './timeline';

const TODAY = '2026-11-10';
const items = [
  {
    slug: 'a',
    name: 'A',
    kind: 'civilian' as const,
    startDate: '2000-01-01',
    endDate: '2010-01-01',
  },
  {
    slug: 'b',
    name: 'B',
    kind: 'military' as const,
    startDate: '2010-01-01',
    endDate: '2015-01-01',
  },
  { slug: 'c', name: 'C', kind: 'civilian' as const, startDate: '2015-01-01', endDate: null },
];

describe('ribbonSegments', () => {
  it('sizes each segment by days in office, incumbent running to today', () => {
    const s = ribbonSegments(items, TODAY);
    const total = s.reduce((n, x) => n + x.widthPct, 0);
    expect(total).toBeCloseTo(100, 6);
    expect(s[0]!.widthPct / s[1]!.widthPct).toBeCloseTo(3653 / 1826, 6);
    expect(s[2]!.endDate).toBeNull();
  });

  it('places each segment where the previous one ends', () => {
    const s = ribbonSegments(items, TODAY);
    expect(s[0]!.startPct).toBe(0);
    expect(s[1]!.startPct).toBeCloseTo(s[0]!.widthPct, 6);
    expect(s[2]!.startPct).toBeCloseTo(s[0]!.widthPct + s[1]!.widthPct, 6);
  });

  it('labels segments with their year range', () => {
    expect(ribbonSegments(items, TODAY).map((x) => x.years)).toEqual([
      '2000–2010',
      '2010–2015',
      '2015–present',
    ]);
  });

  it('returns nothing for an empty list', () => {
    expect(ribbonSegments([], TODAY)).toEqual([]);
  });
});

describe('ribbonTicks', () => {
  it('marks each decade inside the span at its proportional position', () => {
    const ticks = ribbonTicks('2000-01-01', '2020-01-01', 10);
    expect(ticks.map((t) => t.year)).toEqual([2000, 2010, 2020]);
    expect(ticks[1]!.pct).toBeCloseTo(50, 1);
  });

  it('starts at the first round year after a mid-year start', () => {
    expect(ribbonTicks('1957-03-06', '2026-11-10', 10).map((t) => t.year)).toEqual([
      1960, 1970, 1980, 1990, 2000, 2010, 2020,
    ]);
  });
});

describe('filterByKind', () => {
  it('keeps only the requested kind', () => {
    expect(filterByKind(items, 'military').map((x) => x.slug)).toEqual(['b']);
  });

  it('returns everything for no filter or an unknown value', () => {
    expect(filterByKind(items, undefined)).toHaveLength(3);
    expect(filterByKind(items, 'royal')).toHaveLength(3);
  });
});
