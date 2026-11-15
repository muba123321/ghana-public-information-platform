import 'server-only';
import {
  type CommitmentFilters,
  getCommitment,
  listCommitments,
  listCommitmentsForAdministration,
  listOutstanding,
  listSectors,
} from '@gpip/db';
import { cache } from 'react';
import { getDb } from '@/server/db';

export const loadCommitments = cache(async (f: CommitmentFilters) =>
  listCommitments(await getDb(), f),
);
export const loadCommitment = cache(async (slug: string) => getCommitment(await getDb(), slug));
export const loadOutstanding = cache(async () => listOutstanding(await getDb()));
export const loadAdministrationCommitments = cache(async (slug: string) =>
  listCommitmentsForAdministration(await getDb(), slug),
);
export const loadSectors = cache(async () => listSectors(await getDb()));
