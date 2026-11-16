import type { TenureSummary } from '@gpip/core';
import Link from 'next/link';
import { NotAvailable } from '@/components/ui/NotAvailable';
import { Sparkline } from '@/features/indicators';
import { summaryText } from '../summary-text';
import styles from './TermIndicators.module.css';

interface Row {
  code: string;
  name: string;
  unit: string;
  summary: TenureSummary;
}

/** The same indicators for every government: what it inherited, its last figure, and the change. */
export function TermIndicators({ slug, rows }: { slug: string; rows: Row[] }) {
  return (
    <section aria-labelledby="term-indicators" className={styles.section}>
      <h2 id="term-indicators" className="section-title">
        Indicators in this term
      </h2>
      <p className={styles.caveat}>Being in office is not the same as causing a change.</p>
      <div className={styles.wrap}>
        <table className="series-table">
          <thead>
            <tr>
              <th scope="col">Indicator</th>
              <th scope="col">Inherited</th>
              <th scope="col">Last figure</th>
              <th scope="col">Change</th>
              <th scope="col">Years with figures</th>
              <th scope="col">
                <span className={styles.hidden}>Trend</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ code, name, unit, summary }) => {
              const t = summaryText(summary);
              return (
                <tr key={code}>
                  <th scope="row">
                    <Link href={`/history/indicators/${code}`}>{name}</Link>
                    <span className={styles.unit}>{unit}</span>
                  </th>
                  <td>{t.inherited ?? <NotAvailable what="Inherited figure" />}</td>
                  <td>{t.last ?? <NotAvailable what="Last figure" />}</td>
                  <td>{t.change ?? <NotAvailable what="Change" />}</td>
                  <td>{t.coverage}</td>
                  <td>
                    <Sparkline
                      values={summary.points.map((p) => p.value)}
                      sparse={summary.sparse}
                      label={`${name} during this term`}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p>
        <Link href={`/history/compare?a=${slug}`}>Compare with another government</Link> ·{' '}
        <Link href="/methodology">How we compare</Link>
      </p>
    </section>
  );
}
