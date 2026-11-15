import 'server-only';
import { resolve } from 'node:path';
import { storeFromEnv } from '@gpip/ingest/web';

/** The document archive: R2 in production, repo-root .data/archive locally (next runs in apps/web). */
export const archiveStore = () =>
  storeFromEnv(process.env, resolve(process.cwd(), '../../.data/archive'));
