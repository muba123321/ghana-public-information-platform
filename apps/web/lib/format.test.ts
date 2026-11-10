import { expect, it } from 'vitest';
import { formatDate, formatRange, yearRange } from './format';

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
