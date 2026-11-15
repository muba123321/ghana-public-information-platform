import { listReviewQueue } from '@gpip/db';
import Link from 'next/link';
import { PageHeader } from '@/components/layout/PageHeader';
import { KindBadge } from '@/features/commitments';
import { getDb } from '@/server/db';
import { requireEditor } from '@/server/editor-access';

export default async function ReviewQueue() {
  await requireEditor(); // pages render without the layout on client navigations
  const items = await listReviewQueue(await getDb());
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
