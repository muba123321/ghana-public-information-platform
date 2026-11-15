import 'server-only';
import { listPublicDocuments } from '@gpip/db';
import { cache } from 'react';
import { getDb } from '@/server/db';

export const loadSources = cache(async () => listPublicDocuments(await getDb()));
