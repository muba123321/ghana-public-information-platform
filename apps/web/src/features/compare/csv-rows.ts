import type { Comparison } from './comparison';

type Cell = string | number | null;

/** One CSV row per indicator and government: the same figures as the table, empty when not available. */
export function toCsvRows(c: Comparison): [string[], Cell[][]] {
  return [
    [
      'indicator',
      'government',
      'inherited_year',
      'inherited',
      'last_year',
      'last',
      'average',
      'change',
      'years_with_figures',
      'years_in_office',
    ],
    c.indicators.flatMap((ind) =>
      ind.rows.map(({ stretchLabel, summary: s }) => [
        ind.code,
        stretchLabel,
        s.baseline?.year ?? null,
        s.baseline?.value ?? null,
        s.end?.year ?? null,
        s.end?.value ?? null,
        s.average,
        s.change,
        s.coverage.withValue,
        s.coverage.total,
      ]),
    ),
  ];
}
