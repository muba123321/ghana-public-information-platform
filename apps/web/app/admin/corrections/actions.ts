'use server';

import { setCorrectionStatus } from '@gpip/db';
import { revalidatePath } from 'next/cache';
import { requireEditor } from '../../../lib/admin';
import { getDb } from '../../../lib/db';

const STATUSES = ['reviewed', 'actioned', 'dismissed'] as const;

export async function setCorrectionStatusAction(form: FormData) {
  const editor = await requireEditor();
  const status = String(form.get('status'));
  if (!STATUSES.includes(status as (typeof STATUSES)[number])) return;
  await setCorrectionStatus(
    await getDb(),
    Number(form.get('id')),
    status as (typeof STATUSES)[number],
    editor,
  );
  revalidatePath('/admin/corrections');
}
