import { describe, expect, it } from 'vitest';
import type { EstimateType, ObservationPoint } from './indicator.ts';
import { annualPeriod } from './period.ts';
import type { Tenure } from './tenure.ts';
import { tenureSummary } from './tenure-summary.ts';

const point = (
  year: number,
  value: number | null,
  estimateType: EstimateType = 'reported',
): ObservationPoint => ({ period: annualPeriod(year), value, estimateType, vintage: '2026-11-01' });

const a: Tenure = { slug: 'a', start: '2001-01-07', end: '2009-01-07' };
const b: Tenure = { slug: 'b', start: '2009-01-07', end: null };
const all = [a, b];
const TODAY = '2026-11-15';

describe('tenureSummary', () => {
  it('associates years by majority and summarises them', () => {
    const series = [
      point(2000, 10),
      ...[12, 13, 14, 15, 16, 17, 18, 19].map((v, i) => point(2001 + i, v)),
      point(2009, 30),
    ];
    const s = tenureSummary(series, a, all, 'annual', TODAY);
    expect(s.baseline).toEqual({ year: 2000, value: 10 });
    expect(s.end).toEqual({ year: 2008, value: 19 });
    expect(s.average).toBe(15.5);
    expect(s.change).toBe(9);
    expect(s.coverage).toEqual({ withValue: 8, total: 8 });
    expect(s.points.map((p) => p.year)).not.toContain(2009);
    expect(s.transitionYears).toEqual([]);
    expect(tenureSummary(series, b, all, 'annual', TODAY).transitionYears).toEqual([2009]);
  });

  it('end is the last year that has a value, labelled with its year', () => {
    const series = [point(2008, 1), point(2024, 5), point(2025, null), point(2026, 9)];
    const s = tenureSummary(series, b, all, 'annual', TODAY);
    expect(s.end).toEqual({ year: 2024, value: 5 });
    expect(s.points.map((p) => p.year)).not.toContain(2026); // 2026 is not over yet
  });

  it('never counts a missing value as zero', () => {
    const s = tenureSummary(
      [point(2001, 10), point(2002, null), point(2003, 20)],
      a,
      all,
      'annual',
      TODAY,
    );
    expect(s.average).toBe(15);
    // Every year in office counts, whether or not the publisher printed a figure for it.
    expect(s.coverage).toEqual({ withValue: 2, total: 8 });
    expect(s.points).toHaveLength(8);
    expect(s.points[1]).toEqual({ year: 2002, value: null });
  });

  it('a tenure shorter than a year has nothing to summarise', () => {
    const x: Tenure = { slug: 'x', start: '1979-06-04', end: '1979-09-24' };
    // As in 1979: SMC II held 155 days of the year, the AFRC 112, the Third Republic 98.
    const w: Tenure = { slug: 'w', start: '1978-07-05', end: '1979-06-04' };
    const y: Tenure = { slug: 'y', start: '1979-09-24', end: '1981-12-31' };
    const s = tenureSummary([point(1978, 70), point(1979, 54)], x, [w, x, y], 'annual', TODAY);
    expect(s).toMatchObject({
      end: null,
      average: null,
      change: null,
      coverage: { withValue: 0, total: 0 },
      sparse: false,
      points: [],
    });
  });

  it('projections are left out and modelled values are flagged', () => {
    const s = tenureSummary(
      [point(2001, 1, 'modelled'), point(2002, 2), point(2003, 99, 'projected')],
      a,
      all,
      'annual',
      TODAY,
    );
    expect(s.points.find((p) => p.year === 2003)?.value).toBeNull(); // projection never counted
    expect(s.modelled).toBe(true);
    expect(s.end).toEqual({ year: 2002, value: 2 });
  });

  it('change is null when the inherited value is missing', () => {
    const s = tenureSummary([point(2000, null), point(2001, 5)], a, all, 'annual', TODAY);
    expect(s.baseline).toEqual({ year: 2000, value: null });
    expect(s.change).toBeNull();
  });

  it('marks a tenure sparse when fewer than half its years have figures', () => {
    const s = tenureSummary(
      [point(2001, 5), point(2002, null), point(2003, null)],
      a,
      all,
      'annual',
      TODAY,
    );
    expect(s.sparse).toBe(true);
  });
});

describe('inherited figure after a mid-year handover', () => {
  // As in 1981: the Third Republic held most of 1981; the PNDC took over on 31 December.
  const limann: Tenure = { slug: 'limann', start: '1979-09-24', end: '1981-12-31' };
  const pndc: Tenure = { slug: 'pndc', start: '1981-12-31', end: '1993-01-07' };
  const series = [1979, 1980, 1981, 1982, 1983].map((y) => point(y, y - 1900));

  it('is the year just before the first year in office, so no year is skipped or counted twice', () => {
    const s = tenureSummary(series, pndc, [limann, pndc], 'annual', TODAY);
    expect(s.points[0]?.year).toBe(1982);
    expect(s.baseline).toEqual({ year: 1981, value: 81 });
    const prev = tenureSummary(series, limann, [limann, pndc], 'annual', TODAY);
    expect(prev.end).toEqual({ year: 1981, value: 81 }); // one government's last year is the next one's start
  });

  it('never falls back to an older year when that year has no figure', () => {
    const gap = series.map((p) => (p.period.start.startsWith('1981') ? { ...p, value: null } : p));
    expect(tenureSummary(gap, pndc, [limann, pndc], 'annual', TODAY).baseline).toEqual({
      year: 1981,
      value: null,
    });
  });
});
