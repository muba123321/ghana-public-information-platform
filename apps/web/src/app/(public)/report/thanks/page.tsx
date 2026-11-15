import type { Metadata } from 'next';
import { ReportThanks } from '@/features/corrections';

export const metadata: Metadata = { title: 'Report received', robots: { index: false } };

export default function ThanksPage() {
  return <ReportThanks />;
}
