import { getDocumentFile } from '@gpip/db';
import { archiveStore, currentEditor } from '../../../../../lib/admin';
import { getDb } from '../../../../../lib/db';
import { archivedFileHeaders } from '../../../../../lib/files';

export const dynamic = 'force-dynamic';

/** Archived originals are served to editors only; the public gets the publisher's link. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await currentEditor()))
    return new Response('Sign in as an editor to view archived files.', { status: 401 });
  const doc = await getDocumentFile(await getDb(), (await params).id);
  if (!doc) return new Response('Not found', { status: 404 });
  const bytes = await archiveStore().get(doc.storageKey);
  if (!bytes) return new Response('Archived file missing', { status: 404 });
  return new Response(Buffer.from(bytes), { headers: archivedFileHeaders(doc.mime, bytes) });
}
