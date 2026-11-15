import type { ReviewItem } from '@gpip/db';
import Link from 'next/link';
import { PageHeader } from '@/components/layout/PageHeader';
import { KindBadge } from '@/features/commitments';

/** Drafts waiting for an editor, in document and page order. */
export function ReviewQueue({ items }: { items: Omit<ReviewItem, 'budgets'>[] }) {
  return (
    <>
      <PageHeader
        title="Review queue"
        lede={
          <>
            {items.length === 0
              ? 'Nothing waiting. Archive a document and run an extraction to add items.'
              : `${items.length} waiting, in document and page order.`}
          </>
        }
      />
      <ol className="queue">
        {items.map((i) => (
          <li key={i.slug}>
            <Link href={`/admin/review/${i.slug}`} className="queue-link">
              <span className="queue-wording">{i.wording}</span>
              <span className="queue-meta">
                {i.documentTitle}, page {i.page} <KindBadge kind={i.kind} />
              </span>
            </Link>
          </li>
        ))}
      </ol>
    </>
  );
}
