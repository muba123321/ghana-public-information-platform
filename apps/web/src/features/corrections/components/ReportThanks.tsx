import Link from 'next/link';
import { PageContainer } from '@/components/layout/PageContainer';
import { PageHeader } from '@/components/layout/PageHeader';

export function ReportThanks() {
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
