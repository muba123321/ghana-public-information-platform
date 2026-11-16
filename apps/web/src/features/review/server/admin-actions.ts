'use server';
import 'server-only';

import {
  approveCommitment,
  type BudgetEdit,
  type CommitmentEdit,
  ReviewError,
  rejectCommitment,
} from '@gpip/db';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { getDb } from '@/server/db';
import { requireEditor } from '@/server/editor-access';
import { setFlash } from '@/server/flash';
import { loadReviewQueue } from './admin-queries';

const text = (f: FormData, k: string) => String(f.get(k) ?? '').trim();
const optional = (f: FormData, k: string) => text(f, k) || null;

async function next(slugDone: string): Promise<never> {
  revalidatePath('/history', 'layout');
  const [following] = (await loadReviewQueue()).filter((i) => i.slug !== slugDone);
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
    regions: form.getAll('region').map(String),
    nationwide: form.get('nationwide') === 'on',
    budgets: form.getAll('budgetId').map((raw) => {
      const id = Number(raw);
      const year = text(form, `budget-${id}-fiscalYear`);
      return {
        id,
        amount: Number(text(form, `budget-${id}-amount`)),
        currency: text(form, `budget-${id}-currency`) as BudgetEdit['currency'],
        fiscalYear: year ? Number(year) : null,
        publish: form.get(`budget-${id}-publish`) === 'on',
      };
    }),
  };
  try {
    await approveCommitment(await getDb(), slug, edit, editor);
  } catch (e) {
    if (e instanceof ReviewError) {
      const path = `/admin/review/${encodeURIComponent(slug)}`;
      await setFlash(path, { kind: 'error', text: e.message });
      redirect(path);
    }
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
