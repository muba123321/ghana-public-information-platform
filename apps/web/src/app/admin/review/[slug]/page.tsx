import { notFound } from 'next/navigation';
import { ReviewForm } from '@/features/review';
import { approveAction, rejectAction } from '@/features/review/server/admin-actions';
import { loadReviewItem, loadReviewOptions } from '@/features/review/server/admin-queries';
import { requireEditor } from '@/server/editor-access';
import { readFlash } from '@/server/flash';

type Props = { params: Promise<{ slug: string }> };

export default async function ReviewItemPage({ params }: Props) {
  await requireEditor(); // pages render without the layout on client navigations
  const item = await loadReviewItem((await params).slug);
  if (!item) notFound();
  const [flash, options] = await Promise.all([readFlash(), loadReviewOptions()]);
  return (
    <ReviewForm
      item={item}
      flash={flash}
      administrations={options.administrations}
      sectors={options.sectors}
      regions={options.regions}
      approve={approveAction}
      reject={rejectAction}
    />
  );
}
