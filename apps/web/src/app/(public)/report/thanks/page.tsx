import type { Metadata } from 'next';
import Link from 'next/link';
import { PageContainer } from '@/components/layout/PageContainer';
import { PageHeader } from '@/components/layout/PageHeader';

export const metadata: Metadata = { title: 'Report received', robots: { index: false } };

export default function ThanksPage() {
  return (
    <PageContainer prose>
      <PageHeader title="Thank you — an editor will review this." />
      <p>
        If the correction is accepted it will appear in the{' '}
        <Link href="/changes">public change log</Link>.
      </p>
    </PageContainer>
  );
}
