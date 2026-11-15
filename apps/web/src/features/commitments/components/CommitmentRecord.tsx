import type { CommitmentDetail } from '@gpip/db';
import Link from 'next/link';
import { formatDate } from '@/lib/format';
import { COMMITMENT_LINK_LABELS, VERIFICATION_LABELS } from '../labels';
import { KindBadge } from './KindBadge';
import { MoneyList } from './MoneyList';
import { StatusLabel } from './StatusLabel';
import { StewardshipTimeline } from './StewardshipTimeline';

/**
 * One commitment, quoted as printed, with each government that held it, its money, evidence,
 * responsible ministries and related commitments. `timeline` is every government's slug in order.
 */
export function CommitmentRecord({ c, timeline }: { c: CommitmentDetail; timeline: string[] }) {
  return (
    <div className="container page commitment-page">
      <p className="crumbs">
        <Link href="/history/commitments">All commitments</Link>
      </p>

      <figure className="commitment-figure">
        <blockquote className="commitment-quote-large">{c.wording}</blockquote>
        <figcaption>
          {c.document.publisher},{' '}
          <a href={c.document.url} rel="noopener">
            {c.document.title}
          </a>
          , page {c.document.page}
        </figcaption>
      </figure>

      <ul className="profile-facts">
        <li>
          <KindBadge kind={c.kind} />
        </li>
        <li>
          <StatusLabel status={c.finalStatus} />
        </li>
        <li>
          Made by{' '}
          <Link href={`/history/administrations/${c.originatingAdministration.slug}`}>
            {c.originatingAdministration.name}
          </Link>
        </li>
        {c.target && <li>Target: {c.target}</li>}
        {c.targetDeadline && <li>By {formatDate(c.targetDeadline)}</li>}
      </ul>

      <section>
        <h2 className="section-title">Across governments</h2>
        <p className="muted measure">
          Each government that held this commitment, and the progress made while it was in office.
          The government that finished it is not credited with the whole.
        </p>
        <StewardshipTimeline stewardships={c.stewardships} timeline={timeline} />
      </section>

      <section>
        <h2 className="section-title">Money</h2>
        <MoneyList budgets={c.budgets} />
      </section>

      {c.progress.length > 0 && (
        <section>
          <h2 className="section-title">Evidence of progress</h2>
          <ul className="event-list">
            {c.progress.map((p) => (
              <li key={`${p.date}-${p.description}`}>
                <span className="event-date">{formatDate(p.date)}</span> {p.description}{' '}
                <span className="verification" data-v={p.verification}>
                  {VERIFICATION_LABELS[p.verification]}
                </span>{' '}
                <a href={p.url} rel="noopener" className="muted">
                  ({p.source})
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}

      {c.institutions.length > 0 && (
        <section>
          <h2 className="section-title">Responsible</h2>
          <ul className="inline-list">
            {c.institutions.map((i) => (
              <li key={i.slug}>
                <Link href={`/history/ministries/${i.slug}`}>{i.name}</Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {c.links.length > 0 && (
        <section>
          <h2 className="section-title">Related commitments</h2>
          <ul className="inline-list">
            {c.links.map((l) => (
              <li key={`${l.direction}-${l.slug}-${l.kind}`}>
                {l.direction === 'to' ? COMMITMENT_LINK_LABELS[l.kind] : 'Referred to by'}{' '}
                <Link href={`/history/commitments/${l.slug}`}>another commitment</Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {c.notes.some((n) => n.kind === 'unresolved_question') && (
        <section className="pending">
          <h2 className="section-title">Unresolved questions</h2>
          <ul>
            {c.notes
              .filter((n) => n.kind === 'unresolved_question')
              .map((n) => (
                <li key={n.body}>{n.body}</li>
              ))}
          </ul>
        </section>
      )}

      <p className="muted">
        Something wrong?{' '}
        <Link href={`/report?from=${encodeURIComponent(`/history/commitments/${c.slug}`)}`}>
          Report an error
        </Link>
        .
      </p>
    </div>
  );
}
