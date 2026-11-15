import type { Metadata } from 'next';
import { ChangeLog } from '@/features/changes';
import { CHANGES_PER_PAGE, loadChangeLog } from '@/features/changes/server/queries';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Change log' };

type Props = { searchParams: Promise<{ page?: string }> };

export default async function ChangesPage({ searchParams }: Props) {
  const page = Math.max(1, Number((await searchParams).page) || 1);
  const { items, total } = await loadChangeLog(page);
  return (
    <ChangeLog items={items} page={page} pages={Math.max(1, Math.ceil(total / CHANGES_PER_PAGE))} />
  );
}
