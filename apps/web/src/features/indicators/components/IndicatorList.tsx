import type { IndicatorSeries, IndicatorSummary } from '@gpip/db';
import Link from 'next/link';
import { PageContainer } from '@/components/layout/PageContainer';
import { PageHeader } from '@/components/layout/PageHeader';
import { buildChartModel } from '../chart-model';
import { Sparkline } from './Sparkline';

interface Props {
  indicators: IndicatorSummary[];
  series: Map<string, IndicatorSeries | null>;
  today: string;
}

/** Every indicator, grouped by sector, each with a sparkline of its recorded values. */
export function IndicatorList({ indicators, series, today }: Props) {
  const sectors = [...new Map(indicators.map((i) => [i.sectorSlug, i.sectorName])).entries()];

  return (
    <PageContainer>
      <PageHeader
        title="National indicators"
        lede={
          <>
            {indicators.length} measures of Ghana&apos;s economy and society, from the World Bank
            and the IMF, with each government&apos;s time in office marked on every chart.
          </>
        }
      />
      {sectors.map(([slug, name]) => (
        <section key={slug} className="indicator-group" aria-labelledby={`sector-${slug}`}>
          <h2 id={`sector-${slug}`} className="section-title">
            {name}
          </h2>
          <ul className="indicator-list">
            {indicators
              .filter((i) => i.sectorSlug === slug)
              .map((i) => {
                // Year-aligned values: gaps stay gaps, projections are excluded.
                const model = buildChartModel(series.get(i.code)?.points ?? [], [], [], today);
                return (
                  <li key={i.code}>
                    <Link href={`/history/indicators/${i.code}`} className="indicator-link">
                      <span className="indicator-name">{i.name}</span>
                      <span className="indicator-meta">
                        {i.unit}
                        {i.firstYear ? `, ${i.firstYear}–${i.lastYear}` : ', not yet imported'}
                      </span>
                    </Link>
                    <Sparkline
                      values={model.actual}
                      sparse={model.sparse}
                      label={`${i.name} trend`}
                    />
                  </li>
                );
              })}
          </ul>
        </section>
      ))}
    </PageContainer>
  );
}
