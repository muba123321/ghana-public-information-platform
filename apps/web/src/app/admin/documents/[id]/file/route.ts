import { loadDocumentFile } from '@/features/documents/server/admin-queries';
import { archivedFileHeaders } from '@/server/archived-file';
import { currentEditor } from '@/server/editor-access';

export const dynamic = 'force-dynamic';

/** Archived originals are served to editors only; the public gets the publisher's link. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await currentEditor()))
    return new Response('Sign in as an editor to view archived files.', { status: 401 });
  const file = await loadDocumentFile((await params).id);
  if (!file) return new Response('Not found', { status: 404 });
  return new Response(Buffer.from(file.bytes), {
    headers: archivedFileHeaders(file.mime, file.bytes),
  });
}
