import 'server-only';
import { getAdministration, listAdministrations } from '@gpip/db';
import { cache } from 'react';
import { todayIso } from '@/lib/format';
import { getDb } from '@/server/db';
import { ribbonSegments, ribbonTicks } from '../timeline';

/** Request-scoped loaders: metadata and page share one query. */
export const loadAdministrations = cache(async () => listAdministrations(await getDb()));

export const loadAdministration = cache(async (slug: string) =>
  getAdministration(await getDb(), slug),
);

/** Every government plus the ribbon drawn from them, as of today. */
export const loadRibbon = cache(async () => {
  const items = await loadAdministrations();
  const today = todayIso();
  const first = items[0];
  const last = items.at(-1);
  const ticks = first && last ? ribbonTicks(first.startDate, last.endDate ?? today, 10) : [];
  return { items, today, segments: ribbonSegments(items, today), ticks };
});

export type Ribbon = Awaited<ReturnType<typeof loadRibbon>>;
