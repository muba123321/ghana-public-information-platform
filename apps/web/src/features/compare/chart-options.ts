import type { ComparisonIndicator, Tone } from './comparison';

export interface CompareSeries {
  name: string;
  tone: Tone;
  /** [years in office, value, calendar year]; 0 = the inherited value. null values are gaps, never 0. */
  data: [number, number | null, number][];
}

/** One line per row, aligned on years in office so every government starts from what it inherited. */
export function compareChartSeries(indicator: ComparisonIndicator): CompareSeries[] {
  return indicator.rows.map(({ stretchLabel, tone, summary }) => {
    const hasData = summary.points.some((p) => p.value !== null) || summary.baseline?.value != null;
    if (!hasData) return { name: stretchLabel, tone, data: [] };
    const data: [number, number | null, number][] = summary.points.map((p, i) => [
      i + 1,
      p.value,
      p.year,
    ]);
    if (summary.baseline) data.unshift([0, summary.baseline.value, summary.baseline.year]);
    return { name: stretchLabel, tone, data };
  });
}
