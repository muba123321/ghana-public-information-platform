import { describe, expect, it } from 'vitest';
import {
  formatDate,
  formatDuration,
  formatRange,
  fullYearsBetween,
  timeInOffice,
  yearRange,
} from './format';

it('formats ISO dates in day-month-year', () => {
  expect(formatDate('2012-07-24')).toBe('24 Jul 2012');
});

it('formats an open range as present', () => {
  expect(formatRange('2025-01-07', null)).toBe('7 Jan 2025 – present');
});

it('formats year ranges, collapsing single-year tenures', () => {
  expect(yearRange('2009-01-07', '2013-01-07')).toBe('2009–2013');
  expect(yearRange('1979-06-04', '1979-09-24')).toBe('1979');
  expect(yearRange('2025-01-07', null)).toBe('2025–present');
});

describe('formatDuration', () => {
  it('describes multi-year tenures in years and months', () => {
    expect(formatDuration('2009-01-07', '2013-01-07', '2026-11-10')).toBe('4 years');
    expect(formatDuration('1981-12-31', '1993-01-07', '2026-11-10')).toBe('11 years');
    expect(formatDuration('2009-01-07', '2012-07-24', '2026-11-10')).toBe('3 years, 6 months');
  });

  it('describes short tenures in months or days', () => {
    expect(formatDuration('1979-06-04', '1979-09-24', '2026-11-10')).toBe('3 months');
    expect(formatDuration('1970-08-07', '1970-08-31', '2026-11-10')).toBe('24 days');
  });

  it('measures an incumbent up to today', () => {
    expect(formatDuration('2025-01-07', null, '2026-11-10')).toBe('1 year, 10 months');
  });
});

describe('fullYearsBetween', () => {
  it('counts complete years', () => {
    expect(fullYearsBetween('1957-03-06', '2026-11-10')).toBe(69);
    expect(fullYearsBetween('1957-03-06', '2027-03-05')).toBe(69);
    expect(fullYearsBetween('1957-03-06', '2027-03-06')).toBe(70);
  });
});

describe('formatDuration for a government that has not started yet', () => {
  it('never shows a negative duration', () => {
    expect(formatDuration('2029-01-07', null, '2028-12-18')).toBe('Not yet in office');
    expect(timeInOffice('2029-01-07', null, '2028-12-18')).toBe('Not yet in office');
    expect(timeInOffice('2009-01-07', '2013-01-07', '2026-11-10')).toBe('4 years in office');
  });
});
