import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { loadAdministrations } from '@/features/administrations/server/queries';
import { buildChartModel, IndicatorProfile } from '@/features/indicators';
import { loadContextEvents, loadIndicatorSeries } from '@/features/indicators/server/queries';
import { todayIso } from '@/lib/format';

export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ code: string }>; searchParams: Promise<{ vintage?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const s = await loadIndicatorSeries((await params).code);
  return { title: s?.indicator.name ?? 'Indicator not found' };
}

export default async function IndicatorPage({ params, searchParams }: Props) {
  const { code } = await params;
  const { vintage } = await searchParams;
  const s = await loadIndicatorSeries(code, vintage);
  if (!s) notFound();
  const [admins, events] = await Promise.all([loadAdministrations(), loadContextEvents()]);
  const model = buildChartModel(s.points, admins, events, todayIso());
  return <IndicatorProfile s={s} model={model} events={events} />;
}
