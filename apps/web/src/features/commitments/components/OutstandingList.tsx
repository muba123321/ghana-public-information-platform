import type { CommitmentSummary } from '@gpip/db';
import Link from 'next/link';
import { PageContainer } from '@/components/layout/PageContainer';
import { PageHeader } from '@/components/layout/PageHeader';
import { Callout } from '@/components/ui/Callout';
import { CommitmentCard } from './CommitmentCard';

/** Unfinished commitments, grouped by the government that holds them now. */
export function OutstandingList({ items }: { items: CommitmentSummary[] }) {
  const holders = [
    ...new Map(items.map((c) => [c.currentHolder?.slug ?? '', c.currentHolder])).entries(),
  ];
  return (
    <PageContainer>
      <PageHeader
        title="Outstanding commitments"
        lede="Commitments not yet completed, grouped by the government that holds them now. A commitment stays here across changes of government until it is completed, discontinued or replaced."
      />
      {items.length === 0 ? (
        <Callout>No outstanding commitments are published yet.</Callout>
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
    </PageContainer>
  );
}
