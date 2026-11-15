import type { AdministrationDetail, CommitmentSummary } from '@gpip/db';
import Link from 'next/link';
import { PageHeader } from '@/components/layout/PageHeader';
import { Callout } from '@/components/ui/Callout';
import { CommitmentCard } from '@/features/commitments';
import { formatDate, formatRange, timeInOffice } from '@/lib/format';
import { ADMINISTRATION_KIND_LABELS, COMMITMENT_GROUP_HEADINGS } from '../labels';
import type { RibbonSegment, ribbonTicks } from '../timeline';
import styles from './AdministrationProfile.module.css';
import { LeaderBars } from './LeaderBars';
import { TimelineRibbon } from './TimelineRibbon';

interface Props {
  a: AdministrationDetail;
  segments: RibbonSegment[];
  ticks: ReturnType<typeof ribbonTicks>;
  commitments: Record<keyof typeof COMMITMENT_GROUP_HEADINGS, CommitmentSummary[]>;
  today: string;
}

/** One government's record: dates, leaders, commitments, source and neighbours. */
export function AdministrationProfile({ a, segments, ticks, commitments, today }: Props) {
  return (
    <>
      <section className={styles.profileHead}>
        <div className="container">
          <PageHeader
            title={a.name}
            back={{ href: '/history/administrations', label: 'All governments' }}
          />
          <p className={styles.profileDates}>{formatRange(a.startDate, a.endDate)}</p>
          <ul className="profile-facts">
            <li>{timeInOffice(a.startDate, a.endDate, today)}</li>
            <li>{ADMINISTRATION_KIND_LABELS[a.kind]}</li>
            {a.party && (
              <li>
                {a.party.name} ({a.party.abbreviation})
              </li>
            )}
          </ul>
        </div>
        <div className="container container--wide">
          <TimelineRibbon segments={segments} ticks={ticks} currentSlug={a.slug} size="compact" />
        </div>
      </section>

      <div className={`container page ${styles.profileBody}`}>
        <section>
          <h2 className="section-title">Leaders</h2>
          <LeaderBars
            leaders={a.leaders}
            start={a.startDate}
            end={a.endDate ?? today}
            adminEnd={a.endDate}
          />
          {a.notes && <Callout>{a.notes}</Callout>}
        </section>

        <section className={styles.profileCommitments}>
          <h2 className="section-title">Commitments</h2>
          {(['originated', 'inherited', 'handedOver'] as const).map((group) => {
            const items = commitments[group];
            const heading = COMMITMENT_GROUP_HEADINGS[group];
            return (
              <div key={group}>
                <h3>{heading}</h3>
                {items.length === 0 ? (
                  <p className="muted">None published yet.</p>
                ) : (
                  <ul className="commitment-list">
                    {items.map((c) => (
                      <CommitmentCard key={c.slug} c={c} />
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
          <p className="muted">
            Budgets and indicators for this government are on each commitment and indicator page.
          </p>
        </section>

        <section className="source">
          <h2 className="section-title">Source</h2>
          <p>
            {a.source.publisher}:{' '}
            <a href={a.source.url} rel="noopener">
              {a.source.title}
            </a>
            <br />
            <span className="muted">Retrieved {formatDate(a.source.retrievedOn)}</span>
          </p>
        </section>

        <nav className="pager" aria-label="Neighbouring governments">
          {a.previous ? (
            <Link href={`/history/administrations/${a.previous.slug}`} className={styles.pagerLink}>
              <span className={styles.pagerDir}>Previous</span>
              <span className={styles.pagerName}>{a.previous.name}</span>
            </Link>
          ) : (
            <span />
          )}
          {a.next && (
            <Link
              href={`/history/administrations/${a.next.slug}`}
              className={`${styles.pagerLink} ${styles.pagerLinkNext}`}
            >
              <span className={styles.pagerDir}>Next</span>
              <span className={styles.pagerName}>{a.next.name}</span>
            </Link>
          )}
        </nav>
      </div>
    </>
  );
}
