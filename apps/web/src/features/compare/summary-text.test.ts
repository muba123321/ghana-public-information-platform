import type { TenureSummary } from '@gpip/core';
import { describe, expect, it } from 'vitest';
import { summaryText } from './summary-text';

const s: TenureSummary = {
  baseline: { year: 2016, value: 17.5 },
  end: { year: 2020, value: 9.9 },
  average: 11,
  change: 2.3,
  coverage: { withValue: 1, total: 4 },
  sparse: true,
  modelled: true,
  transitionYears: [2017],
  points: [],
};

describe('summaryText', () => {
  it('labels a change in a percentage as percentage points', () => {
    expect(summaryText(s, '% per year').change).toBe('+2.3 pp');
    expect(summaryText(s, 'GHS per USD').change).toBe('+2.3');
  });

  it('says when few years have figures, a year was shared, or figures are modelled', () => {
    expect(summaryText(s, '%').coverage).toBe(
      '1 of 4 · few figures · includes a shared year · includes modelled estimates',
    );
  });
});
