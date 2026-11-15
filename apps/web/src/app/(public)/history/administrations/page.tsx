import type { Metadata } from 'next';
import { AdministrationDirectory, parseKind } from '@/features/administrations';
import { loadRibbon } from '@/features/administrations/server/queries';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Administration directory' };

type Props = { searchParams: Promise<{ kind?: string }> };

export default async function AdministrationsPage({ searchParams }: Props) {
  const { items, segments, ticks } = await loadRibbon();
  return (
    <AdministrationDirectory
      items={items}
      segments={segments}
      ticks={ticks}
      kind={parseKind((await searchParams).kind)}
    />
  );
}
