import 'server-only';
import { resolve } from 'node:path';
import { createDb, type Db } from '@gpip/db';

let db: Promise<Db> | undefined;

/**
 * One shared connection per server process. Without DATABASE_URL, uses the repo-root local PGlite
 * database that `pnpm db:seed` fills (next runs with cwd = apps/web).
 */
export function getDb(): Promise<Db> {
  db ??= createDb(
    process.env.DATABASE_URL ?? `pglite:${resolve(process.cwd(), '../../.data/pglite')}`,
  );
  return db;
}
