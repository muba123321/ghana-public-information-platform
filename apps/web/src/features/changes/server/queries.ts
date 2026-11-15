import 'server-only';
import { listChangeLog } from '@gpip/db';
import { getDb } from '@/server/db';

export const CHANGES_PER_PAGE = 50;

export const loadChangeLog = async (page: number) =>
  listChangeLog(await getDb(), { page, perPage: CHANGES_PER_PAGE });
