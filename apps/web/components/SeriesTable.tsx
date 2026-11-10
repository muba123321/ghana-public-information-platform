import type { ChartModel } from '../lib/chart';
import { formatValue } from '../lib/number';
import { NotAvailable } from './NotAvailable';

interface Props {
  model: ChartModel;
  unit: string;
  /** The whole indicator is a modelled estimate. */
  modelled: boolean;
}

/** The chart's data as a table — the accessible, printable, copyable version. Newest first. */
export function SeriesTable({ model, unit, modelled }: Props) {
  const rows = model.years
    .map((year, i) => ({
      year,
      actual: model.actual[i] ?? null,
      projected: model.projected[i] ?? null,
    }))
    .filter((r) => !model.sparse || r.actual !== null || r.projected !== null)
    .reverse();
  return (
    <table className="series-table">
      <thead>
        <tr>
          <th scope="col">Year</th>
          <th scope="col">Value ({unit})</th>
          <th scope="col">Note</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => {
          const value = r.projected ?? r.actual;
          return (
            <tr key={r.year}>
              <td>{r.year}</td>
              <td>
                {value === null ? <NotAvailable what={`${r.year} value`} /> : formatValue(value)}
              </td>
              <td>
                {r.projected !== null
                  ? 'IMF projection'
                  : value !== null && modelled
                    ? 'Modelled estimate'
                    : ''}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
