import { listReviewQueue } from '@gpip/db';
import Link from 'next/link';
import { KindBadge } from '../../../components/KindBadge';
import { getDb } from '../../../lib/db';

export default async function ReviewQueue() {
  const items = await listReviewQueue(await getDb());
  return (
    <>
      <h1 className="page-title">Review queue</h1>
      <p className="page-lede">
        {items.length === 0
          ? 'Nothing waiting. Archive a document and run an extraction to add items.'
          : `${items.length} waiting, in document and page order.`}
      </p>
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
