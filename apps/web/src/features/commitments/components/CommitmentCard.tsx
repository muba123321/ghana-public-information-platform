import type { CommitmentSummary } from '@gpip/db';
import Link from 'next/link';
import styles from './CommitmentCard.module.css';
import { KindBadge } from './KindBadge';
import { StatusLabel } from './StatusLabel';

export function CommitmentCard({ c }: { c: CommitmentSummary }) {
  return (
    <li className={styles.commitmentCard}>
      <Link href={`/history/commitments/${c.slug}`} className={styles.commitmentLink}>
        <q className={styles.commitmentQuote}>{c.wording}</q>
      </Link>
      <p className={styles.commitmentMeta}>
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
