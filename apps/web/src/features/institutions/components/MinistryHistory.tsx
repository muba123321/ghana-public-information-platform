import type { CommitmentSummary, InstitutionHistory, InstitutionSummary } from '@gpip/db';
import Link from 'next/link';
import { PageContainer } from '@/components/layout/PageContainer';
import { PageHeader } from '@/components/layout/PageHeader';
import { CommitmentCard } from '@/features/commitments';
import { formatRange } from '@/lib/format';
import { LINEAGE_LABELS } from '../labels';

interface Props {
  history: InstitutionHistory;
  /** Every published institution, to name the other end of each reorganisation. */
  all: InstitutionSummary[];
  commitments: CommitmentSummary[];
}

/** One ministry: its names over time, reorganisations, and the commitments it was responsible for. */
export function MinistryHistory({ history, all, commitments }: Props) {
  // Never fall back to the raw identifier: it could name an unpublished institution.
  const nameOf = (s: string) => all.find((i) => i.slug === s)?.name ?? 'another institution';

  return (
    <PageContainer>
      <PageHeader
        title={history.versions.at(-1)?.name}
        back={{ href: '/history/ministries', label: 'All ministries' }}
      />

      <h2 className="section-title">Names over time</h2>
      <ol className="spine">
        {history.versions.map((v) => (
          <li key={`${v.name}-${v.validFrom}`} className="spine-item">
            <span className="spine-name">{v.name}</span>
            <p className="spine-meta">{formatRange(v.validFrom, v.validTo)}</p>
            {v.mandate && <p>{v.mandate}</p>}
          </li>
        ))}
      </ol>

      {history.lineage.length > 0 && (
        <>
          <h2 className="section-title">Reorganisations</h2>
          <ul className="event-list">
            {history.lineage.map((l) => (
              <li key={`${l.fromSlug}-${l.toSlug}-${l.kind}`}>
                <span className="event-date">{l.effectiveOn.slice(0, 4)}</span>{' '}
                <Link href={`/history/ministries/${l.fromSlug}`}>{nameOf(l.fromSlug)}</Link>{' '}
                {LINEAGE_LABELS[l.kind as keyof typeof LINEAGE_LABELS] ?? l.kind}{' '}
                <Link href={`/history/ministries/${l.toSlug}`}>{nameOf(l.toSlug)}</Link>
              </li>
            ))}
          </ul>
        </>
      )}

      <h2 className="section-title">Commitments it was responsible for</h2>
      {commitments.length === 0 ? (
        <p className="muted">None published yet.</p>
      ) : (
        <ul className="commitment-list">
          {commitments.map((c) => (
            <CommitmentCard key={c.slug} c={c} />
          ))}
        </ul>
      )}
    </PageContainer>
  );
}
