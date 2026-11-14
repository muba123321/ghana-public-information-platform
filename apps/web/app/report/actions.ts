'use server';

import { submitCorrection } from '@gpip/db';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { getDb } from '../../lib/db';
import { clientIp, senderHash } from '../../lib/sender';

const field = (f: FormData, k: string) => String(f.get(k) ?? '');

export async function submitReportAction(form: FormData) {
  const from = field(form, 'pageUrl') || '/';
  // Honeypot: people never see this field; bots fill it. Pretend success, store nothing.
  if (field(form, 'website')) redirect('/report/thanks');

  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error('AUTH_SECRET is required to accept reports');
  const result = await submitCorrection(
    await getDb(),
    {
      pageUrl: from,
      message: field(form, 'message'),
      evidenceUrl: field(form, 'evidenceUrl') || null,
      contact: field(form, 'contact') || null,
    },
    { ipHash: senderHash(clientIp(await headers()), secret) },
  );
  if (!result.ok)
    redirect(`/report?from=${encodeURIComponent(from)}&error=${encodeURIComponent(result.error)}`);
  redirect('/report/thanks');
}
