'use server';

import Anthropic from '@anthropic-ai/sdk';
import { archiveDocument, extractCommitments, MAX_DOCUMENT_BYTES } from '@gpip/ingest/web';
import { redirect } from 'next/navigation';
import { archiveStore } from '@/server/archive-store';
import { getDb } from '@/server/db';
import { requireEditor } from '@/server/editor-access';
import { setFlash } from '@/server/flash';

const PATH = '/admin/documents';
async function back(kind: 'error' | 'note', text: string): Promise<never> {
  await setFlash(PATH, { kind, text });
  redirect(PATH);
}

export async function archiveAction(form: FormData) {
  await requireEditor();
  const file = form.get('file');
  const url = String(form.get('url') ?? '').trim();
  const upload = file instanceof File && file.size > 0 ? file : null;
  if (!url) await back('error', "Give the publisher's URL for this document.");
  if (upload && upload.size > MAX_DOCUMENT_BYTES) await back('error', 'File is larger than 40 MB.');
  if (url && !/^https:\/\//.test(url)) await back('error', 'URL must start with https://');

  let message: string;
  try {
    const r = await archiveDocument(await getDb(), archiveStore(), {
      ...(upload
        ? {
            upload: { bytes: new Uint8Array(await upload.arrayBuffer()), filename: upload.name },
            sourceUrl: url,
          }
        : { url }),
      title: String(form.get('title') ?? '').trim(),
      docType: String(form.get('docType') ?? 'manifesto'),
      publisher: String(form.get('publisher') ?? '').trim(),
      ...(String(form.get('administrationSlug') ?? '').trim()
        ? { administrationSlug: String(form.get('administrationSlug')).trim() }
        : {}),
      publicRedistribution: form.get('publicRedistribution') === 'on',
    });
    message = r.duplicate ? 'Already archived — same file.' : 'Archived.';
  } catch (e) {
    await back('error', e instanceof Error ? e.message : 'Archive failed');
    return;
  }
  await back('note', message);
}

export async function extractAction(form: FormData) {
  await requireEditor();
  const documentId = String(form.get('documentId') ?? '');
  const r = await extractCommitments(
    await getDb(),
    { client: new Anthropic(), store: archiveStore() },
    documentId,
  );
  await back(
    r.status === 'ok' ? 'note' : 'error',
    r.status === 'ok'
      ? `${r.queued} of ${r.found} queued for review.`
      : (r.error ?? 'Extraction failed'),
  );
}
