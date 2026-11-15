import 'server-only';
import { getInstitutionHistory, listInstitutions } from '@gpip/db';
import { cache } from 'react';
import { getDb } from '@/server/db';

export const loadInstitutions = cache(async () => listInstitutions(await getDb()));
export const loadInstitutionHistory = cache(async (slug: string) =>
  getInstitutionHistory(await getDb(), slug),
);
