import 'server-only';
import { getAdministration, listAdministrations } from '@gpip/db';
import { cache } from 'react';
import { getDb } from './db';
import { todayIso } from './format';
import { ribbonSegments, ribbonTicks } from './timeline';

/** Request-scoped loaders: metadata and page share one query. */
export const loadAdministrations = cache(async () => listAdministrations(await getDb()));
export const loadAdministration = cache(async (slug: string) =>
  getAdministration(await getDb(), slug),
);

export const loadRibbon = cache(async () => {
  const items = await loadAdministrations();
  const today = todayIso();
  const first = items[0];
  const last = items.at(-1);
  const ticks = first && last ? ribbonTicks(first.startDate, last.endDate ?? today, 10) : [];
  return { items, today, segments: ribbonSegments(items, today), ticks };
});
