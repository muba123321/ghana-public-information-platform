import { describe, expect, it } from 'vitest';
import {
  annualPeriod,
  fullYearsBetween,
  monthsBetween,
  overlapDays,
  parseIsoDate,
  periodDays,
} from './period.ts';

describe('period maths', () => {
  it('counts days in a leap year', () => {
    expect(periodDays({ start: '2024-01-01', end: '2025-01-01' })).toBe(366);
  });

  it('counts overlap of a year with a tenure starting 7 January', () => {
    expect(overlapDays(annualPeriod(2017), { start: '2017-01-07', end: '2021-01-07' })).toBe(359);
  });

  it('returns 0 for disjoint periods', () => {
    expect(overlapDays(annualPeriod(2016), { start: '2017-01-07', end: '2021-01-07' })).toBe(0);
  });

  it('builds a half-open annual period', () => {
    expect(annualPeriod(1979)).toEqual({ start: '1979-01-01', end: '1980-01-01' });
  });

  it('accepts a valid ISO date', () => {
    expect(parseIsoDate('2024-02-29')).toBe('2024-02-29');
  });

  it.each(['2023-02-30', '2023-13-01', '23-01-01', '2023-1-1', ''])('rejects %j', (s) => {
    expect(() => parseIsoDate(s)).toThrow(RangeError);
  });
});

describe('calendar differences', () => {
  it('counts whole months, not counting a month that has not finished', () => {
    expect(monthsBetween('2024-01-31', '2024-02-29')).toBe(0);
    expect(monthsBetween('2024-01-15', '2025-03-15')).toBe(14);
  });

  it('counts complete years', () => {
    expect(fullYearsBetween('1957-03-06', '2026-11-10')).toBe(69);
    expect(fullYearsBetween('1957-03-06', '2027-03-05')).toBe(69);
    expect(fullYearsBetween('1957-03-06', '2027-03-06')).toBe(70);
  });
});
