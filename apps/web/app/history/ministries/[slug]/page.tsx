import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { CommitmentCard } from '../../../../components/CommitmentCard';
import { loadCommitments, loadInstitutionHistory, loadInstitutions } from '../../../../lib/data';
import { formatRange } from '../../../../lib/format';

export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ slug: string }> };

const LINEAGE = {
  renamed: 'renamed to',
  merged_into: 'merged into',
  split_from: 'split from',
  replaced_by: 'replaced by',
  absorbed_functions_of: 'took over functions of',
} as const;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const h = await loadInstitutionHistory((await params).slug);
  return { title: h?.versions.at(-1)?.name ?? 'Institution not found' };
}

export default async function MinistryPage({ params }: Props) {
  const { slug } = await params;
  const [history, all, commitments] = await Promise.all([
    loadInstitutionHistory(slug),
    loadInstitutions(),
    loadCommitments({ institution: slug }),
  ]);
  if (!history || history.versions.length === 0) notFound();
  // Never fall back to the raw identifier: it could name an unpublished institution.
  const nameOf = (s: string) => all.find((i) => i.slug === s)?.name ?? 'another institution';

  return (
    <div className="container page">
      <p className="crumbs">
        <Link href="/history/ministries">All ministries</Link>
      </p>
      <h1 className="page-title">{history.versions.at(-1)?.name}</h1>

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
                {LINEAGE[l.kind as keyof typeof LINEAGE] ?? l.kind}{' '}
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
    </div>
  );
}
