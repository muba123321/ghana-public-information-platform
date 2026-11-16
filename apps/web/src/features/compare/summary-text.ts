import type { TenureSummary } from '@gpip/core';
import { formatValue } from '@/features/indicators';

/**
 * Display text for a summary's figures; null means "Not available" (never 0). A change in a
 * percentage is in percentage points ("pp"), never a percent of a percent.
 */
export const summaryText = (s: TenureSummary, unit: string) => {
  const notes = [
    s.sparse && 'few figures',
    s.transitionYears.length > 0 && 'includes a shared year',
    s.modelled && 'includes modelled estimates',
  ].filter(Boolean);
  return {
    inherited:
      s.baseline?.value != null ? `${formatValue(s.baseline.value)} (${s.baseline.year})` : null,
    last: s.end ? `${formatValue(s.end.value)} (${s.end.year})` : null,
    average: s.average != null ? formatValue(s.average) : null,
    change:
      s.change != null
        ? `${s.change > 0 ? '+' : ''}${formatValue(s.change)}${unit.includes('%') ? ' pp' : ''}`
        : null,
    coverage: [`${s.coverage.withValue} of ${s.coverage.total}`, ...notes].join(' · '),
  };
};
