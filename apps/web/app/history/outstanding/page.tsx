import type { Metadata } from 'next';
import Link from 'next/link';
import { CommitmentCard } from '../../../components/CommitmentCard';
import { loadOutstanding } from '../../../lib/data';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Outstanding commitments' };

export default async function OutstandingPage() {
  const items = await loadOutstanding();
  const holders = [
    ...new Map(items.map((c) => [c.currentHolder?.slug ?? '', c.currentHolder])).entries(),
  ];
  return (
    <div className="container page">
      <h1 className="page-title">Outstanding commitments</h1>
      <p className="page-lede">
        Commitments not yet completed, grouped by the government that holds them now. A commitment
        stays here across changes of government until it is completed, discontinued or replaced.
      </p>
      {items.length === 0 ? (
        <p className="callout">No outstanding commitments are published yet.</p>
      ) : (
        holders.map(([slug, holder]) => (
          <section key={slug} className="indicator-group">
            <h2 className="section-title">
              {holder ? (
                <Link href={`/history/administrations/${slug}`}>{holder.name}</Link>
              ) : (
                'Not yet assigned'
              )}
            </h2>
            <ul className="commitment-list">
              {items
                .filter((c) => (c.currentHolder?.slug ?? '') === slug)
                .map((c) => (
                  <CommitmentCard key={c.slug} c={c} />
                ))}
            </ul>
          </section>
        ))
      )}
    </div>
  );
}
