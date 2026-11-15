import { DocumentsAdmin } from '@/features/documents';
import { archiveAction, extractAction } from '@/features/documents/server/admin-actions';
import { loadDocumentsForAdmin } from '@/features/documents/server/admin-queries';
import { requireEditor } from '@/server/editor-access';
import { readFlash } from '@/server/flash';

export default async function DocumentsPage() {
  await requireEditor(); // pages render without the layout on client navigations
  return (
    <DocumentsAdmin
      docs={await loadDocumentsForAdmin()}
      flash={await readFlash()}
      archive={archiveAction}
      extract={extractAction}
    />
  );
}
