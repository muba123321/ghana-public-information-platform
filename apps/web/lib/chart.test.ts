import { annualPeriod, type ObservationPoint } from '@gpip/core';
import { describe, expect, it } from 'vitest';
import { buildChartModel } from './chart';

const TODAY = '2026-11-10';
const pt = (
  year: number,
  value: number | null,
  estimateType: ObservationPoint['estimateType'] = 'reported',
): ObservationPoint => ({
  period: annualPeriod(year),
  value,
  estimateType,
  vintage: '2026-11-10',
});
const admins = [
  {
    slug: 'a',
    name: 'A',
    kind: 'military' as const,
    startDate: '1981-12-31',
    endDate: '1993-01-07',
  },
  {
    slug: 'b',
    name: 'B',
    kind: 'civilian' as const,
    startDate: '1993-01-07',
    endDate: '2001-01-07',
  },
  { slug: 'c', name: 'C', kind: 'civilian' as const, startDate: '2001-01-07', endDate: null },
];

describe('buildChartModel', () => {
  it('spans first to last point, with missing years as null', () => {
    const m = buildChartModel([pt(1995, 1), pt(1997, 3)], admins, [], TODAY);
    expect(m.years).toEqual(['1995', '1996', '1997']);
    expect(m.actual).toEqual([1, null, 3]);
  });

  it('keeps projections out of the actual series', () => {
    const m = buildChartModel(
      [pt(2024, 10), pt(2025, 11), pt(2026, 12, 'projected'), pt(2027, 13, 'projected')],
      admins,
      [],
      TODAY,
    );
    expect(m.actual).toEqual([10, 11, null, null]);
    expect(m.projected).toEqual([null, null, 12, 13]);
    expect(m.hasProjection).toBe(true);
  });

  it('clips administration bands to the span and alternates tone by position', () => {
    const m = buildChartModel([pt(1990, 1), pt(2005, 2)], admins, [], TODAY);
    expect(m.bands).toEqual([
      { from: '1990', to: '1993', name: 'A', kind: 'military', tone: 'a' },
      { from: '1993', to: '2001', name: 'B', kind: 'civilian', tone: 'b' },
      { from: '2001', to: '2005', name: 'C', kind: 'civilian', tone: 'a' },
    ]);
  });

  it('drops bands outside the span', () => {
    expect(
      buildChartModel([pt(1995, 1), pt(1999, 2)], admins, [], TODAY).bands.map((b) => b.name),
    ).toEqual(['B']);
  });

  it('includes only context events inside the span', () => {
    const events = [
      { date: '2008-09-15', title: 'Crisis' },
      { date: '1970-01-01', title: 'Too early' },
    ];
    expect(buildChartModel([pt(2000, 1), pt(2010, 2)], admins, events, TODAY).events).toEqual([
      { year: '2008', title: 'Crisis' },
    ]);
  });

  it('flags sparse survey series so they are drawn as points', () => {
    const sparse = buildChartModel(
      [pt(1987, 50), pt(1998, 40), pt(2005, 30), pt(2016, 25)],
      admins,
      [],
      TODAY,
    );
    expect(sparse.sparse).toBe(true);
    expect(buildChartModel([pt(2000, 1), pt(2001, 2), pt(2002, 3)], admins, [], TODAY).sparse).toBe(
      false,
    );
  });

  it('is empty for a series with no data', () => {
    expect(buildChartModel([], admins, [], TODAY)).toMatchObject({
      years: [],
      bands: [],
      events: [],
    });
  });
});

describe('isolated values', () => {
  it('marks values with gaps on both sides so they can be drawn as dots', () => {
    const m = buildChartModel(
      [pt(2020, 1), pt(2021, 2), pt(2022, 3), pt(2024, 5)],
      admins,
      [],
      TODAY,
    );
    expect(m.isolated).toEqual([false, false, false, false, true]);
  });

  it('treats a series end next to a gap as isolated', () => {
    const m = buildChartModel([pt(2020, 1), pt(2022, 3), pt(2023, 4)], admins, [], TODAY);
    expect(m.isolated).toEqual([true, false, false, false]);
  });
});
