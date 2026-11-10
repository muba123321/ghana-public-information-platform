import { describe, expect, it } from 'vitest';
import {
  annualFromYear,
  latestVintage,
  type ObservationPoint,
  seriesAt,
  splitProjected,
  yearOnYear,
} from './indicator.ts';
import { annualPeriod } from './period.ts';

const pt = (
  year: number,
  value: number | null,
  vintage = '2026-11-10',
  estimateType: ObservationPoint['estimateType'] = 'reported',
): ObservationPoint => ({ period: annualPeriod(year), value, vintage, estimateType });

describe('vintages', () => {
  it('finds the latest vintage', () => {
    expect(latestVintage([pt(2016, 1, '2026-01-01'), pt(2016, 2, '2026-11-10')])).toBe(
      '2026-11-10',
    );
    expect(latestVintage([])).toBeNull();
  });

  it('returns a vintage as a whole snapshot, sorted by period', () => {
    const points = [
      pt(2017, 3, '2026-11-10'),
      pt(2015, 9, '2026-01-01'),
      pt(2016, 2, '2026-11-10'),
      pt(2016, 1, '2026-01-01'),
    ];
    expect(seriesAt(points, '2026-11-10').map((p) => [p.period.start, p.value])).toEqual([
      ['2016-01-01', 2],
      ['2017-01-01', 3],
    ]);
  });
});

describe('splitProjected', () => {
  it('keeps projections apart from actual values', () => {
    const { actual, projected } = splitProjected([
      pt(2025, 1),
      pt(2026, 2, undefined, 'projected'),
      pt(2024, 3, undefined, 'modelled'),
    ]);
    expect(actual.map((p) => p.value)).toEqual([1, 3]);
    expect(projected.map((p) => p.value)).toEqual([2]);
  });
});

describe('yearOnYear', () => {
  it('is null when either side is missing', () => {
    expect(yearOnYear([pt(2016, 10), pt(2017, null), pt(2018, 12)]).map((c) => c.change)).toEqual([
      null,
      null,
    ]);
  });

  it('subtracts the previous period', () => {
    expect(yearOnYear([pt(2016, 10), pt(2017, 12.5)])).toEqual([
      { period: annualPeriod(2017), change: 2.5 },
    ]);
  });

  it('does not compare across a missing year', () => {
    expect(yearOnYear([pt(2014, 10), pt(2016, 12)])).toEqual([
      { period: annualPeriod(2016), change: null },
    ]);
  });
});

describe('annualFromYear', () => {
  it('builds the calendar-year period', () => {
    expect(annualFromYear('2017')).toEqual(annualPeriod(2017));
  });

  it.each(['19x0', '217', '', '20170'])('rejects %j', (y) => {
    expect(() => annualFromYear(y)).toThrow(RangeError);
  });
});
