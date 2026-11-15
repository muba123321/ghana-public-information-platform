'use server';
import 'server-only';

import { setCorrectionStatus } from '@gpip/db';
import { revalidatePath } from 'next/cache';
import { getDb } from '@/server/db';
import { requireEditor } from '@/server/editor-access';
import { isCorrectionOutcome } from '../outcomes';

export async function setCorrectionStatusAction(form: FormData) {
  const editor = await requireEditor();
  const status = String(form.get('status'));
  if (!isCorrectionOutcome(status)) return;
  await setCorrectionStatus(await getDb(), Number(form.get('id')), status, editor);
  revalidatePath('/admin/corrections');
}
