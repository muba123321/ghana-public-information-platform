import { describe, expect, it } from 'vitest';
import { inheritedBaseline } from './baseline.ts';
import { annualPeriod } from './period.ts';
import type { Tenure } from './tenure.ts';

const term: Tenure = { slug: '2017-akufo-addo-i', start: '2017-01-07', end: '2021-01-07' };
const series = [2017, 2014, 2016, 2015].map((y) => ({ period: annualPeriod(y), value: y }));

describe('inheritedBaseline', () => {
  it('is the last complete period ending on the start date', () => {
    expect(inheritedBaseline({ ...term, start: '2017-01-01' }, series)?.value).toBe(2016);
  });

  it('excludes a period still running when the tenure starts', () => {
    expect(inheritedBaseline(term, series)?.value).toBe(2016);
  });

  it('returns the prior period with null value rather than skipping back', () => {
    const s = [
      { period: annualPeriod(2015), value: 5 },
      { period: annualPeriod(2016), value: null },
    ];
    expect(inheritedBaseline(term, s)).toEqual({ period: annualPeriod(2016), value: null });
  });

  it('returns null when the series starts after the tenure', () => {
    expect(inheritedBaseline(term, [{ period: annualPeriod(2018), value: 1 }])).toBeNull();
  });
});
