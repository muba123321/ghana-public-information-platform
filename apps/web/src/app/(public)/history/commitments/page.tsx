import type { Metadata } from 'next';
import { loadAdministrations } from '@/features/administrations/server/queries';
import {
  type CommitmentSearch,
  CommitmentTracker,
  parseCommitmentFilters,
} from '@/features/commitments';
import { loadCommitments, loadSectors } from '@/features/commitments/server/queries';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Commitment tracker' };

type Props = { searchParams: Promise<CommitmentSearch> };

export default async function CommitmentsPage({ searchParams }: Props) {
  const search = await searchParams;
  const [administrations, sectors] = await Promise.all([loadAdministrations(), loadSectors()]);
  const filters = parseCommitmentFilters(search, {
    administrations: administrations.map((a) => a.slug),
    sectors: sectors.map((s) => s.slug),
  });
  return (
    <CommitmentTracker
      items={await loadCommitments(filters)}
      search={search}
      filters={filters}
      administrations={administrations}
      sectors={sectors}
    />
  );
}
