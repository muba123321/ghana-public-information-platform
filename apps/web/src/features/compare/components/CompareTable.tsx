import { NotAvailable } from '@/components/ui/NotAvailable';
import { formatValue } from '@/features/indicators';
import type { ComparisonIndicator } from '../comparison';
import styles from './CompareTable.module.css';

const signed = (v: number) => `${v > 0 ? '+' : ''}${formatValue(v)}`;

/** Every figure behind the chart: inherited, last figure (with its year), average, change, coverage. */
export function CompareTable({ indicator }: { indicator: ComparisonIndicator }) {
  return (
    <div className={styles.wrap}>
      <table className="series-table">
        <caption className={styles.caption}>
          {indicator.name} ({indicator.unit}) for each government compared
        </caption>
        <thead>
          <tr>
            <th scope="col">Government</th>
            <th scope="col">Inherited</th>
            <th scope="col">Last figure</th>
            <th scope="col">Average</th>
            <th scope="col">Change</th>
            <th scope="col">Years with figures</th>
          </tr>
        </thead>
        <tbody>
          {indicator.rows.map(({ stretchLabel, tone, summary: s }) => (
            <tr key={stretchLabel}>
              <th scope="row">
                <span className={styles.swatch} data-tone={tone} aria-hidden="true" />
                {stretchLabel}
              </th>
              <td>
                {s.baseline?.value != null ? (
                  `${formatValue(s.baseline.value)} (${s.baseline.year})`
                ) : (
                  <NotAvailable what="Inherited figure" />
                )}
              </td>
              <td>
                {s.end ? (
                  `${formatValue(s.end.value)} (${s.end.year})`
                ) : (
                  <NotAvailable what="Last figure" />
                )}
              </td>
              <td>
                {s.average != null ? formatValue(s.average) : <NotAvailable what="Average" />}
              </td>
              <td>{s.change != null ? signed(s.change) : <NotAvailable what="Change" />}</td>
              <td>
                {s.coverage.withValue} of {s.coverage.total}
                {s.modelled ? ' · includes modelled estimates' : ''}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
