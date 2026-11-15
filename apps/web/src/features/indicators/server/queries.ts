import 'server-only';
import { getIndicatorSeries, listContextEvents, listIndicators } from '@gpip/db';
import { cache } from 'react';
import { getDb } from '@/server/db';

export const loadIndicators = cache(async () => listIndicators(await getDb()));
export const loadIndicatorSeries = cache(async (code: string, vintage?: string) =>
  getIndicatorSeries(await getDb(), code, vintage ? { vintage } : {}),
);
export const loadContextEvents = cache(async () => listContextEvents(await getDb()));
