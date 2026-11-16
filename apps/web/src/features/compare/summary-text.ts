import type { TenureSummary } from '@gpip/core';
import { formatValue } from '@/features/indicators';

/** Display text for a summary's figures; null means "Not available" (never 0). */
export const summaryText = (s: TenureSummary) => ({
  inherited:
    s.baseline?.value != null ? `${formatValue(s.baseline.value)} (${s.baseline.year})` : null,
  last: s.end ? `${formatValue(s.end.value)} (${s.end.year})` : null,
  average: s.average != null ? formatValue(s.average) : null,
  change: s.change != null ? `${s.change > 0 ? '+' : ''}${formatValue(s.change)}` : null,
  coverage: `${s.coverage.withValue} of ${s.coverage.total}${s.modelled ? ' · includes modelled estimates' : ''}`,
});
