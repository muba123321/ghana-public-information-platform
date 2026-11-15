import { safeLocalPath } from '@gpip/core';
import type { Metadata } from 'next';
import { ReportForm } from '@/features/corrections';
import { submitReportAction } from '@/features/corrections/server/actions';
import { readFlash } from '@/server/flash';

export const metadata: Metadata = { title: 'Report an error', robots: { index: false } };

type Props = { searchParams: Promise<{ from?: string }> };

export default async function ReportPage({ searchParams }: Props) {
  const { from } = await searchParams;
  return (
    <ReportForm
      page={safeLocalPath(from ?? '/') ?? '/'}
      flash={await readFlash()}
      action={submitReportAction}
    />
  );
}
