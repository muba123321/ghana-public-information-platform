import Link from 'next/link';
import { PageContainer } from '@/components/layout/PageContainer';
import { PageHeader } from '@/components/layout/PageHeader';
import { Callout } from '@/components/ui/Callout';
import { formatDate } from '@/lib/format';
import { compareChartSeries } from '../chart-options';
import type { CompareSelection } from '../compare-params';
import type { Comparison } from '../comparison';
import { CompareChart } from './CompareChart';
import { ComparePicker } from './ComparePicker';
import { CompareTable } from './CompareTable';
import styles from './CompareView.module.css';

interface Props {
  selection: CompareSelection;
  options: Omit<React.ComponentProps<typeof ComparePicker>, 'selection'>;
  /** null until at least two valid choices are made. */
  comparison: Comparison | null;
  /** Query string of this comparison, for the download links. */
  query: string;
}

export function CompareView({ selection, options, comparison, query }: Props) {
  return (
    <PageContainer>
      <div className={styles.view}>
        <PageHeader
          title="Compare governments"
          lede="Side by side, each from the figure it inherited. No scores."
        />
        <ComparePicker selection={selection} {...options} />
        {!comparison ? (
          <Callout>
            Choose at least two {selection.by === 'person' ? 'leaders' : 'governments'} to compare.
          </Callout>
        ) : (
          <>
            <p className={styles.caveat}>
              Being in office is not the same as causing a change.{' '}
              <Link href="/methodology">How we compare</Link>
            </p>
            <ul className={styles.key} aria-label="Colour key">
              {comparison.tenures.map((t) => (
                <li key={t.key}>
                  <span className={styles.swatch} data-tone={t.tone} aria-hidden="true" />
                  {t.label} <span className={styles.years}>({t.years})</span>
                </li>
              ))}
            </ul>
            {comparison.indicators.map((ind) => (
              <section
                key={ind.code}
                aria-labelledby={`ind-${ind.code}`}
                className={styles.indicator}
              >
                <h2 id={`ind-${ind.code}`} className="section-title">
                  <Link href={`/history/indicators/${ind.code}`}>{ind.name}</Link>{' '}
                  <span className={styles.unit}>({ind.unit})</span>
                </h2>
                <CompareChart series={compareChartSeries(ind)} name={ind.name} unit={ind.unit} />
                <details>
                  <summary>Show the figures</summary>
                  <CompareTable indicator={ind} />
                </details>
              </section>
            ))}
            {comparison.events.length > 0 && (
              <section aria-labelledby="events">
                <h2 id="events" className="section-title">
                  Events in these years
                </h2>
                <ul className="event-list">
                  {comparison.events.map((e) => (
                    <li key={`${e.date}-${e.title}`}>
                      <span className="event-date">{formatDate(e.date)}</span> {e.title}{' '}
                      <a href={e.url} rel="noopener" className="muted">
                        ({e.publisher})
                      </a>
                    </li>
                  ))}
                </ul>
              </section>
            )}
            <p className="muted">
              Download: <a href={`/api/v1/compare?${query}&format=csv`}>CSV</a> ·{' '}
              <a href={`/api/v1/compare?${query}`}>JSON</a>
            </p>
          </>
        )}
      </div>
    </PageContainer>
  );
}
