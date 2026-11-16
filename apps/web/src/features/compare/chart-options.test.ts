import type { TenureSummary } from '@gpip/core';
import { describe, expect, it } from 'vitest';
import { compareChartSeries } from './chart-options';
import type { ComparisonIndicator } from './comparison';

const summary = (over: Partial<TenureSummary>): TenureSummary => ({
  baseline: null,
  end: null,
  average: null,
  change: null,
  coverage: { withValue: 0, total: 0 },
  sparse: false,
  modelled: false,
  transitionYears: [],
  points: [],
  ...over,
});
const indicator: ComparisonIndicator = {
  code: 'inflation',
  name: 'Inflation',
  unit: '%',
  rows: [
    {
      tenureKey: 'k1',
      stretchLabel: 'Kufuor I',
      tone: 'a',
      summary: summary({
        baseline: { year: 2000, value: 25 },
        points: [
          { year: 2001, value: 33 },
          { year: 2002, value: null },
          { year: 2003, value: 26 },
        ],
      }),
    },
    { tenureKey: 'k2', stretchLabel: 'Empty', tone: 'b', summary: summary({}) },
  ],
};

describe('compareChartSeries', () => {
  it('starts each line at its inherited value, at year 0 in office', () => {
    const [first] = compareChartSeries(indicator);
    expect(first?.data[0]).toEqual([0, 25, 2000]);
    expect(first?.data.slice(1)).toEqual([
      [1, 33, 2001],
      [2, null, 2002],
      [3, 26, 2003],
    ]);
  });

  it('keeps missing years as gaps, never zero', () => {
    const [first] = compareChartSeries(indicator);
    expect(first?.data.find(([x]) => x === 2)?.[1]).toBeNull();
  });

  it('a government with no figures draws no line but keeps its tone and label', () => {
    expect(compareChartSeries(indicator)[1]).toEqual({ name: 'Empty', tone: 'b', data: [] });
  });
});
