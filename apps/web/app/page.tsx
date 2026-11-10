import Link from 'next/link';
import { RibbonLegend, TimelineRibbon } from '../components/TimelineRibbon';
import { loadRibbon } from '../lib/data';
import { fullYearsBetween } from '../lib/format';

export const dynamic = 'force-dynamic';

const PRINCIPLES = [
  [
    'No scores, no verdicts',
    'We never rate a government. We show what was published and let you judge.',
  ],
  [
    'A source behind every fact',
    'Every date and figure links to the document or dataset it came from.',
  ],
  [
    'Gaps stay visible',
    'When information was never published we say so. Missing is never counted as zero.',
  ],
  [
    'In office is not the same as caused',
    'Some outcomes start under one government and finish under the next. We keep both.',
  ],
] as const;

export default async function Home() {
  const { items, segments, ticks, today } = await loadRibbon();
  const first = items[0];
  const incumbent = items.at(-1);
  const years = first ? fullYearsBetween(first.startDate, today) : 0;
  const military = items.filter((a) => a.kind === 'military').length;

  return (
    <>
      <section className="hero">
        <div className="container">
          <h1 className="hero-title">{years} years of Ghanaian government, on the record.</h1>
          <p className="hero-lede">
            {items.length} governments since independence: {items.length - military} civilian and{' '}
            {military} military. Follow what each one promised, funded and handed on, with every
            fact linked to its public source.
          </p>
        </div>
        <div className="container container--wide">
          <TimelineRibbon segments={segments} ticks={ticks} />
          <div className="hero-foot">
            <RibbonLegend />
            <p className="hero-hint">
              Each band is one government, sized by its time in office. Select a band to open its
              record.
            </p>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container split">
          <h2 className="section-title">What you can explore</h2>
          <ul className="explore">
            <li>
              <Link href="/history/administrations" className="explore-link">
                Every government since 1957
              </Link>
              <p>
                Leaders, dates and sources for all {items.length} governments, civilian and
                military.
              </p>
            </li>
            <li data-soon>
              <span className="explore-link">Promises and what happened to them</span>
              <p>Manifesto and budget commitments, followed across changes of government.</p>
              <span className="pill">Coming soon</span>
            </li>
            <li data-soon>
              <span className="explore-link">Sixty years of national indicators</span>
              <p>
                Growth, inflation, debt, schooling, health and more, with each government&apos;s
                term marked.
              </p>
              <span className="pill">Coming soon</span>
            </li>
          </ul>
        </div>
      </section>

      <section className="section section--stone">
        <div className="container">
          <h2 className="section-title">How this record stays fair</h2>
          <dl className="principles">
            {PRINCIPLES.map(([title, body]) => (
              <div key={title}>
                <dt>{title}</dt>
                <dd>{body}</dd>
              </div>
            ))}
          </dl>
          <p className="section-cta">
            <Link href="/data-notice">Read how we source and correct data</Link>
          </p>
        </div>
      </section>

      {incumbent && (
        <section className="section">
          <div className="container cta-row">
            <Link href={`/history/administrations/${incumbent.slug}`} className="button">
              See the current government
            </Link>
            <Link href="/history/administrations" className="button button--quiet">
              Browse all {items.length} governments
            </Link>
          </div>
        </section>
      )}
    </>
  );
}
