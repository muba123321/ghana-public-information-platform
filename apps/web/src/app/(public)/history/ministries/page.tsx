import type { Metadata } from 'next';
import { MinistryList } from '@/features/institutions';
import { loadInstitutions } from '@/features/institutions/server/queries';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Ministry history' };

export default async function MinistriesPage() {
  return <MinistryList list={await loadInstitutions()} />;
}
