'use server';

import {
  approveCommitment,
  type CommitmentEdit,
  listReviewQueue,
  ReviewError,
  rejectCommitment,
} from '@gpip/db';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireEditor } from '../../../lib/admin';
import { getDb } from '../../../lib/db';

const text = (f: FormData, k: string) => String(f.get(k) ?? '').trim();
const optional = (f: FormData, k: string) => text(f, k) || null;

async function next(slugDone: string): Promise<never> {
  revalidatePath('/history', 'layout');
  const [following] = (await listReviewQueue(await getDb())).filter((i) => i.slug !== slugDone);
  redirect(following ? `/admin/review/${following.slug}` : '/admin/review');
}

export async function approveAction(form: FormData) {
  const editor = await requireEditor();
  const slug = text(form, 'slug');
  const edit: CommitmentEdit = {
    wording: text(form, 'wording'),
    page: Number(text(form, 'page')),
    kind: text(form, 'kind') as CommitmentEdit['kind'],
    sectorSlug: optional(form, 'sectorSlug'),
    originatingAdministrationSlug: text(form, 'originatingAdministrationSlug'),
    finalStatus: text(form, 'finalStatus') as CommitmentEdit['finalStatus'],
    target: optional(form, 'target'),
    targetDeadline: optional(form, 'targetDeadline'),
  };
  try {
    await approveCommitment(await getDb(), slug, edit, editor);
  } catch (e) {
    if (e instanceof ReviewError)
      redirect(`/admin/review/${encodeURIComponent(slug)}?error=${encodeURIComponent(e.message)}`);
    throw e;
  }
  await next(slug);
}

export async function rejectAction(form: FormData) {
  const editor = await requireEditor();
  const slug = text(form, 'slug');
  await rejectCommitment(await getDb(), slug, text(form, 'reason').slice(0, 500), editor);
  await next(slug);
}
