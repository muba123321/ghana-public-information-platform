import { fullYearsBetween } from '@gpip/core';
import type { AdministrationSummary } from '@gpip/db';
import Link from 'next/link';
import { RibbonLegend, type RibbonSegment, TimelineRibbon } from '@/features/administrations';
import styles from './HomeView.module.css';

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

interface Props {
  items: AdministrationSummary[];
  segments: RibbonSegment[];
  ticks: Parameters<typeof TimelineRibbon>[0]['ticks'];
  today: string;
}

/** The front page: the ribbon of every government, what you can explore, and how the record stays fair. */
export function HomeView({ items, segments, ticks, today }: Props) {
  const first = items[0];
  const incumbent = items.at(-1);
  const years = first ? fullYearsBetween(first.startDate, today) : 0;
  const military = items.filter((a) => a.kind === 'military').length;

  return (
    <>
      <section className="hero">
        <div className="container">
          <h1 className={styles.heroTitle}>{years} years of Ghanaian government, on the record.</h1>
          <p className={styles.heroLede}>
            {items.length} governments since independence: {items.length - military} civilian and{' '}
            {military} military. Follow what each one promised, funded and handed on, with every
            fact linked to its public source.
          </p>
        </div>
        <div className="container container--wide">
          <TimelineRibbon segments={segments} ticks={ticks} />
          <div className={styles.heroFoot}>
            <RibbonLegend />
            <p className={styles.heroHint}>
              Each band is one government, sized by its time in office. Select a band to open its
              record.
            </p>
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <div className={`container ${styles.split}`}>
          <h2 className="section-title">What you can explore</h2>
          <ul className={styles.explore}>
            <li>
              <Link href="/history/administrations" className={styles.exploreLink}>
                Every government since 1957
              </Link>
              <p>
                Leaders, dates and sources for all {items.length} governments, civilian and
                military.
              </p>
            </li>
            <li>
              <Link href="/history/commitments" className={styles.exploreLink}>
                Promises and what happened to them
              </Link>
              <p>Manifesto and budget commitments, followed across changes of government.</p>
            </li>
            <li>
              <Link href="/history/indicators" className={styles.exploreLink}>
                Sixty years of national indicators
              </Link>
              <p>
                Growth, inflation, debt, schooling, health and more, with each government&apos;s
                term marked.
              </p>
            </li>
          </ul>
        </div>
      </section>

      <section className={`${styles.section} ${styles.sectionStone}`}>
        <div className="container">
          <h2 className="section-title">How this record stays fair</h2>
          <dl className={styles.principles}>
            {PRINCIPLES.map(([title, body]) => (
              <div key={title}>
                <dt>{title}</dt>
                <dd>{body}</dd>
              </div>
            ))}
          </dl>
          <p className={styles.sectionCta}>
            <Link href="/data-notice">Read how we source and correct data</Link>
          </p>
        </div>
      </section>

      {incumbent && (
        <section className={styles.section}>
          <div className={`container ${styles.ctaRow}`}>
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
