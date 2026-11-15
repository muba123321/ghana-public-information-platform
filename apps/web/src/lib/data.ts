import 'server-only';
import {
  type CommitmentFilters,
  getAdministration,
  getCommitment,
  getIndicatorSeries,
  getInstitutionHistory,
  listAdministrations,
  listCommitments,
  listCommitmentsForAdministration,
  listContextEvents,
  listIndicators,
  listInstitutions,
  listOutstanding,
  listPublicDocuments,
} from '@gpip/db';
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

export const loadIndicators = cache(async () => listIndicators(await getDb()));
export const loadIndicatorSeries = cache(async (code: string, vintage?: string) =>
  getIndicatorSeries(await getDb(), code, vintage ? { vintage } : {}),
);
export const loadContextEvents = cache(async () => listContextEvents(await getDb()));

export const loadCommitments = cache(async (f: CommitmentFilters) =>
  listCommitments(await getDb(), f),
);
export const loadCommitment = cache(async (slug: string) => getCommitment(await getDb(), slug));
export const loadOutstanding = cache(async () => listOutstanding(await getDb()));
export const loadAdministrationCommitments = cache(async (slug: string) =>
  listCommitmentsForAdministration(await getDb(), slug),
);
export const loadInstitutions = cache(async () => listInstitutions(await getDb()));
export const loadInstitutionHistory = cache(async (slug: string) =>
  getInstitutionHistory(await getDb(), slug),
);
export const loadSources = cache(async () => listPublicDocuments(await getDb()));
