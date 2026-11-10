/**
 * Node-only helpers (scripts, tests, CI): migrations and the local default database.
 * Not imported by the web app — bundlers would try to package the paths below.
 */

import { fileURLToPath } from 'node:url';
import { migrate as migratePglite } from 'drizzle-orm/pglite/migrator';
import { migrate as migratePostgres } from 'drizzle-orm/postgres-js/migrator';
import { createDb, type Db, dbDriver } from './client.ts';

export { seed } from './seed/seed.ts';

const MIGRATIONS_DIR = fileURLToPath(new URL('../migrations', import.meta.url));

/** Repo-root `.data/pglite`, so every package and app shares one local database. */
export const DEFAULT_PGLITE_DIR = fileURLToPath(new URL('../../../.data/pglite', import.meta.url));

/** DATABASE_URL if set, otherwise the shared local PGlite database. */
export function openDb(url = process.env.DATABASE_URL): Promise<Db> {
  return createDb(url ?? `pglite:${DEFAULT_PGLITE_DIR}`);
}

export async function migrateDb(db: Db): Promise<void> {
  const config = { migrationsFolder: MIGRATIONS_DIR };
  // biome-ignore lint/suspicious/noExplicitAny: each migrator needs its own driver-specific db type
  const anyDb = db as any;
  if (dbDriver(db) === 'postgres') await migratePostgres(anyDb, config);
  else await migratePglite(anyDb, config);
}
