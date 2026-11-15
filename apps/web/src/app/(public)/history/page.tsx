import type { Metadata } from 'next';
import { ModuleOverview } from '@/features/overview';

export const metadata: Metadata = { title: 'Government Performance & History' };

export default function HistoryPage() {
  return <ModuleOverview />;
}
