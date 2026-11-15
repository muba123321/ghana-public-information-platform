import { EditorOverview } from '@/features/review';
import { loadReviewCounts } from '@/features/review/server/admin-queries';
import { requireEditor } from '@/server/editor-access';

export default async function AdminHome() {
  await requireEditor(); // pages render without the layout on client navigations
  return <EditorOverview counts={await loadReviewCounts()} />;
}
