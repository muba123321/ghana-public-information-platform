import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { loadCommitments } from '@/features/commitments/server/queries';
import { MinistryHistory } from '@/features/institutions';
import { loadInstitutionHistory, loadInstitutions } from '@/features/institutions/server/queries';

export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ slug: string }> };

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
  return <MinistryHistory history={history} all={all} commitments={commitments} />;
}
