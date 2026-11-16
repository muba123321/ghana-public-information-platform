import type { Metadata } from 'next';
import { Methodology } from '@/features/overview';

export const metadata: Metadata = { title: 'How we compare' };

export default function MethodologyPage() {
  return <Methodology />;
}
