import type { Metadata } from 'next';
import { SourceList } from '@/features/sources';
import { loadSources } from '@/features/sources/server/queries';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Sources and documents' };

export default async function SourcesPage() {
  return <SourceList docs={await loadSources()} />;
}
