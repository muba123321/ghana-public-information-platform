import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { CommitmentCard } from '../../../../components/CommitmentCard';
import { LeaderBars } from '../../../../components/LeaderBars';
import { TimelineRibbon } from '../../../../components/TimelineRibbon';
import {
  loadAdministration,
  loadAdministrationCommitments,
  loadRibbon,
} from '../../../../lib/data';
import { formatDate, formatRange, timeInOffice, todayIso } from '../../../../lib/format';
import { KIND_LABEL } from '../../../../lib/timeline';

export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const a = await loadAdministration((await params).slug);
  return { title: a?.name ?? 'Administration not found' };
}

export default async function AdministrationPage({ params }: Props) {
  const a = await loadAdministration((await params).slug);
  if (!a) notFound();
  const [{ segments, ticks }, commitments] = await Promise.all([
    loadRibbon(),
    loadAdministrationCommitments(a.slug),
  ]);
  const today = todayIso();

  return (
    <>
      <section className="profile-head">
        <div className="container">
          <p className="crumbs">
            <Link href="/history/administrations">All governments</Link>
          </p>
          <h1 className="page-title">{a.name}</h1>
          <p className="profile-dates">{formatRange(a.startDate, a.endDate)}</p>
          <ul className="profile-facts">
            <li>{timeInOffice(a.startDate, a.endDate, today)}</li>
            <li>{KIND_LABEL[a.kind]}</li>
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

      <div className="container page profile-body">
        <section>
          <h2 className="section-title">Leaders</h2>
          <LeaderBars
            leaders={a.leaders}
            start={a.startDate}
            end={a.endDate ?? today}
            adminEnd={a.endDate}
          />
          {a.notes && <p className="callout">{a.notes}</p>}
        </section>

        <section className="profile-commitments">
          <h2 className="section-title">Commitments</h2>
          {(['originated', 'inherited', 'handedOver'] as const).map((group) => {
            const items = commitments[group];
            const heading = {
              originated: 'Made by this government',
              inherited: 'Inherited from earlier governments',
              handedOver: 'Handed on to the next government',
            }[group];
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
            <Link href={`/history/administrations/${a.previous.slug}`} className="pager-link">
              <span className="pager-dir">Previous</span>
              <span className="pager-name">{a.previous.name}</span>
            </Link>
          ) : (
            <span />
          )}
          {a.next && (
            <Link
              href={`/history/administrations/${a.next.slug}`}
              className="pager-link pager-link--next"
            >
              <span className="pager-dir">Next</span>
              <span className="pager-name">{a.next.name}</span>
            </Link>
          )}
        </nav>
      </div>
    </>
  );
}
