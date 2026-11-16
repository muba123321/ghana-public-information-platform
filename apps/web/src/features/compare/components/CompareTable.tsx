import { NotAvailable } from '@/components/ui/NotAvailable';
import type { ComparisonIndicator } from '../comparison';
import { summaryText } from '../summary-text';
import styles from './CompareTable.module.css';

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
          {indicator.rows.map(({ stretchLabel, tone, summary }) => {
            const t = summaryText(summary);
            return (
              <tr key={stretchLabel}>
                <th scope="row">
                  <span className={styles.swatch} data-tone={tone} aria-hidden="true" />
                  {stretchLabel}
                </th>
                <td>{t.inherited ?? <NotAvailable what="Inherited figure" />}</td>
                <td>{t.last ?? <NotAvailable what="Last figure" />}</td>
                <td>{t.average ?? <NotAvailable what="Average" />}</td>
                <td>{t.change ?? <NotAvailable what="Change" />}</td>
                <td>{t.coverage}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
