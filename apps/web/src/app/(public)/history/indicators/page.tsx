import type { Metadata } from 'next';
import { IndicatorList } from '@/features/indicators';
import { loadIndicatorSeries, loadIndicators } from '@/features/indicators/server/queries';
import { todayIso } from '@/lib/format';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'National indicators' };

export default async function IndicatorsPage() {
  const indicators = await loadIndicators();
  const series = new Map(
    await Promise.all(
      indicators.map(async (i) => [i.code, await loadIndicatorSeries(i.code)] as const),
    ),
  );
  return <IndicatorList indicators={indicators} series={series} today={todayIso()} />;
}
