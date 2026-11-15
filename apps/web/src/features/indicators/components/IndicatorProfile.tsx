import type { ContextEvent, IndicatorSeries } from '@gpip/db';
import Link from 'next/link';
import { PageHeader } from '@/components/layout/PageHeader';
import { Callout } from '@/components/ui/Callout';
import { NotAvailable } from '@/components/ui/NotAvailable';
import { formatDate } from '@/lib/format';
import type { ChartModel } from '../chart-model';
import { IndicatorChart } from './IndicatorChart';
import { SeriesTable } from './SeriesTable';

interface Props {
  s: IndicatorSeries;
  model: ChartModel;
  events: ContextEvent[];
}

/** One indicator: chart with governments shaded, how to read it, events, figures and source. */
export function IndicatorProfile({ s, model, events }: Props) {
  const { indicator: ind } = s;

  return (
    <div className="container page indicator-page">
      <PageHeader
        title={ind.name}
        lede={ind.definition}
        back={{ href: '/history/indicators', label: 'All indicators' }}
      />
      <ul className="profile-facts">
        <li>{ind.unit}</li>
        <li>{ind.sectorName}</li>
        {ind.estimateType === 'modelled' && <li>Modelled estimate</li>}
        {ind.firstYear && (
          <li>
            {ind.firstYear}–{ind.lastYear}
          </li>
        )}
      </ul>

      {model.years.length === 0 ? (
        <Callout>
          <NotAvailable what={ind.name} />: figures for this indicator have not been imported yet.
        </Callout>
      ) : (
        <>
          <figure className="chart-figure">
            <IndicatorChart model={model} name={ind.name} unit={ind.unit} />
            <figcaption>
              <span className={`legend-item ${model.sparse ? 'legend-points' : 'legend-series'}`}>
                {ind.name}
              </span>
              {model.hasProjection && (
                <span className="legend-item legend-projection">IMF projection</span>
              )}
              <span className="legend-item legend-band">Shaded: government in office</span>
              {model.events.length > 0 && (
                <span className="legend-item legend-event">Dotted: event</span>
              )}
            </figcaption>
          </figure>

          <aside className="how-to-read">
            <h2>How to read this</h2>
            <p>
              Each shaded band is the government in office during those years. Being in office is
              not the same as causing a change: some effects take years, and events outside Ghana
              matter too.
              {model.sparse && ' Values exist only for survey years, so points are not joined.'}
              {model.hasProjection && ' The dashed line is an IMF forecast, not a measured value.'}
            </p>
          </aside>

          {model.events.length > 0 && (
            <section>
              <h2 className="section-title">Events marked on the chart</h2>
              <ul className="event-list">
                {events
                  .filter((e) =>
                    model.events.some((m) => m.title === e.title && e.date.startsWith(m.year)),
                  )
                  .map((e) => (
                    <li key={`${e.date}-${e.title}`}>
                      <span className="event-date">{formatDate(e.date)}</span> {e.title}{' '}
                      <a href={e.source.url} rel="noopener" className="muted">
                        ({e.source.publisher})
                      </a>
                    </li>
                  ))}
              </ul>
            </section>
          )}

          <details className="table-wrap">
            <summary>Show the figures as a table</summary>
            <SeriesTable model={model} unit={ind.unit} modelled={ind.estimateType === 'modelled'} />
          </details>
        </>
      )}

      <section className="source">
        <h2 className="section-title">Source</h2>
        <p>
          {s.source.publisher}:{' '}
          <a href={s.source.url} rel="noopener">
            {s.source.title}
          </a>{' '}
          (series {ind.seriesCode}
          {s.source.licence ? `, ${s.source.licence}` : ''})
        </p>
        {s.vintage && <p className="muted">Figures as published on {formatDate(s.vintage)}.</p>}
        {ind.methodology && <p className="muted">{ind.methodology}</p>}
        {s.vintages.length > 1 && (
          <nav aria-label="Earlier releases" className="vintages">
            Earlier releases:{' '}
            {s.vintages.map((v) => (
              <Link
                key={v}
                href={`?vintage=${v}`}
                aria-current={v === s.vintage ? 'page' : undefined}
              >
                {formatDate(v)}
              </Link>
            ))}
          </nav>
        )}
        <p>
          <a
            href={`/api/v1/indicators/${ind.code}/observations.csv${s.vintage ? `?vintage=${s.vintage}` : ''}`}
          >
            Download CSV
          </a>
        </p>
      </section>
    </div>
  );
}
