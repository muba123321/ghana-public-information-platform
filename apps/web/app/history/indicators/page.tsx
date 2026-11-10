import type { Metadata } from 'next';
import Link from 'next/link';
import { Sparkline } from '../../../components/Sparkline';
import { loadIndicatorSeries, loadIndicators } from '../../../lib/data';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'National indicators' };

export default async function IndicatorsPage() {
  const indicators = await loadIndicators();
  const series = new Map(
    await Promise.all(
      indicators.map(async (i) => [i.code, await loadIndicatorSeries(i.code)] as const),
    ),
  );
  const sectors = [...new Map(indicators.map((i) => [i.sectorSlug, i.sectorName])).entries()];

  return (
    <div className="container page">
      <h1 className="page-title">National indicators</h1>
      <p className="page-lede">
        {indicators.length} measures of Ghana&apos;s economy and society, from the World Bank and
        the IMF, with each government&apos;s time in office marked on every chart.
      </p>
      {sectors.map(([slug, name]) => (
        <section key={slug} className="indicator-group" aria-labelledby={`sector-${slug}`}>
          <h2 id={`sector-${slug}`} className="section-title">
            {name}
          </h2>
          <ul className="indicator-list">
            {indicators
              .filter((i) => i.sectorSlug === slug)
              .map((i) => {
                const points = series.get(i.code)?.points ?? [];
                const values = points
                  .filter((p) => p.estimateType !== 'projected')
                  .map((p) => p.value);
                return (
                  <li key={i.code}>
                    <Link href={`/history/indicators/${i.code}`} className="indicator-link">
                      <span className="indicator-name">{i.name}</span>
                      <span className="indicator-meta">
                        {i.unit}
                        {i.firstYear ? `, ${i.firstYear}–${i.lastYear}` : ', not yet imported'}
                      </span>
                    </Link>
                    <Sparkline values={values} label={`${i.name} trend`} />
                  </li>
                );
              })}
          </ul>
        </section>
      ))}
    </div>
  );
}
