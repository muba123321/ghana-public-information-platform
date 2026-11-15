import 'server-only';
import { getDocumentFile, listDocumentsForAdmin } from '@gpip/db';
import { archiveStore } from '@/server/archive-store';
import { getDb } from '@/server/db';
import { requireEditor } from '@/server/editor-access';

export async function loadDocumentsForAdmin() {
  await requireEditor();
  return listDocumentsForAdmin(await getDb());
}

/** An archived original and its bytes, or null when the record or the file is missing. */
export async function loadDocumentFile(
  id: string,
): Promise<{ mime: string; bytes: Uint8Array } | null> {
  await requireEditor();
  const doc = await getDocumentFile(await getDb(), id);
  if (!doc) return null;
  const bytes = await archiveStore().get(doc.storageKey);
  return bytes ? { mime: doc.mime, bytes } : null;
}
