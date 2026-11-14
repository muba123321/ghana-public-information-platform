'use server';

import Anthropic from '@anthropic-ai/sdk';
import { archiveDocument, extractCommitments } from '@gpip/ingest/web';
import { redirect } from 'next/navigation';
import { archiveStore, requireEditor } from '../../../lib/admin';
import { getDb } from '../../../lib/db';

const MAX_UPLOAD = 40 * 1024 * 1024;
const back = (q: string): never => redirect(`/admin/documents?${q}`);

export async function archiveAction(form: FormData) {
  await requireEditor();
  const file = form.get('file');
  const url = String(form.get('url') ?? '').trim();
  const upload = file instanceof File && file.size > 0 ? file : null;
  if (!upload === !url) back('error=Choose a PDF file or give a URL (not both).');
  if (upload && upload.size > MAX_UPLOAD) back('error=File is larger than 40 MB.');
  if (url && !/^https:\/\//.test(url)) back('error=URL must start with https://');

  let message: string;
  try {
    const r = await archiveDocument(await getDb(), archiveStore(), {
      ...(upload
        ? { upload: { bytes: new Uint8Array(await upload.arrayBuffer()), filename: upload.name } }
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
    back(`error=${encodeURIComponent(e instanceof Error ? e.message : 'Archive failed')}`);
    return;
  }
  back(`message=${encodeURIComponent(message)}`);
}

export async function extractAction(form: FormData) {
  await requireEditor();
  const documentId = String(form.get('documentId') ?? '');
  const r = await extractCommitments(
    await getDb(),
    { client: new Anthropic(), store: archiveStore() },
    documentId,
  );
  back(
    r.status === 'ok'
      ? `message=${encodeURIComponent(`${r.queued} of ${r.found} queued for review.`)}`
      : `error=${encodeURIComponent(r.error ?? 'Extraction failed')}`,
  );
}
