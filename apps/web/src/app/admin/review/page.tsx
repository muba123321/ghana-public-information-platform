import { ReviewQueue } from '@/features/review';
import { loadReviewQueue } from '@/features/review/server/admin-queries';
import { requireEditor } from '@/server/editor-access';

export default async function ReviewQueuePage() {
  await requireEditor(); // pages render without the layout on client navigations
  return <ReviewQueue items={await loadReviewQueue()} />;
}
