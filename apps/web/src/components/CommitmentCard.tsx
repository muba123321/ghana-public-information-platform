import type { CommitmentSummary } from '@gpip/db';
import Link from 'next/link';
import { KindBadge } from './KindBadge';
import { StatusLabel } from './StatusLabel';

export function CommitmentCard({ c }: { c: CommitmentSummary }) {
  return (
    <li className="commitment-card">
      <Link href={`/history/commitments/${c.slug}`} className="commitment-link">
        <q className="commitment-quote">{c.wording}</q>
      </Link>
      <p className="commitment-meta">
        <KindBadge kind={c.kind} />
        <StatusLabel status={c.finalStatus} />
        <span>Made by {c.originatingAdministration.name}</span>
        {c.currentHolder && c.currentHolder.slug !== c.originatingAdministration.slug && (
          <span>now held by {c.currentHolder.name}</span>
        )}
      </p>
    </li>
  );
}
