import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { AdministrationProfile } from '@/features/administrations';
import { loadAdministration, loadRibbon } from '@/features/administrations/server/queries';
import { loadAdministrationCommitments } from '@/features/commitments/server/queries';
import { TermIndicators } from '@/features/compare';
import { loadTermIndicators } from '@/features/compare/server/queries';
import { todayIso } from '@/lib/format';

export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const a = await loadAdministration((await params).slug);
  return { title: a?.name ?? 'Administration not found' };
}

export default async function AdministrationPage({ params }: Props) {
  const a = await loadAdministration((await params).slug);
  if (!a) notFound();
  const [{ segments, ticks }, commitments, indicators] = await Promise.all([
    loadRibbon(),
    loadAdministrationCommitments(a.slug),
    loadTermIndicators(a.slug),
  ]);
  return (
    <AdministrationProfile
      a={a}
      segments={segments}
      ticks={ticks}
      commitments={commitments}
      today={todayIso()}
    >
      <TermIndicators slug={a.slug} rows={indicators} />
    </AdministrationProfile>
  );
}
