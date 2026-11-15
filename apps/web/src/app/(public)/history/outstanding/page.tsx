import type { Metadata } from 'next';
import { OutstandingList } from '@/features/commitments';
import { loadOutstanding } from '@/features/commitments/server/queries';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Outstanding commitments' };

export default async function OutstandingPage() {
  return <OutstandingList items={await loadOutstanding()} />;
}
