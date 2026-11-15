import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { loadAdministrations } from '@/features/administrations/server/queries';
import { CommitmentRecord } from '@/features/commitments';
import { loadCommitment } from '@/features/commitments/server/queries';

export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const c = await loadCommitment((await params).slug);
  return {
    title: c
      ? `${c.wording.slice(0, 70)}${c.wording.length > 70 ? '…' : ''}`
      : 'Commitment not found',
  };
}

export default async function CommitmentPage({ params }: Props) {
  const { slug } = await params;
  const [c, admins] = await Promise.all([loadCommitment(slug), loadAdministrations()]);
  if (!c) notFound();
  return <CommitmentRecord c={c} timeline={admins.map((a) => a.slug)} />;
}
