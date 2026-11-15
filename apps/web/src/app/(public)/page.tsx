import { loadRibbon } from '@/features/administrations/server/queries';
import { HomeView } from '@/features/overview';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const { items, segments, ticks, today } = await loadRibbon();
  return <HomeView items={items} segments={segments} ticks={ticks} today={today} />;
}
