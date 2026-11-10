import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { PGlite } from '@electric-sql/pglite';
import { btree_gist } from '@electric-sql/pglite/contrib/btree_gist';
import type { PgDatabase, PgQueryResultHKT } from 'drizzle-orm/pg-core';
import { drizzle as drizzlePglite } from 'drizzle-orm/pglite';
import { migrate as migratePglite } from 'drizzle-orm/pglite/migrator';
import { drizzle as drizzlePostgres } from 'drizzle-orm/postgres-js';
import { migrate as migratePostgres } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import * as schema from './schema/index.js';

export type Schema = typeof schema;
export type Db = PgDatabase<PgQueryResultHKT, Schema>;

const MIGRATIONS = fileURLToPath(new URL('../migrations', import.meta.url));
/** Repo-root `.data/pglite`, so every package and app shares one local database. */
export const DEFAULT_PGLITE_DIR = fileURLToPath(new URL('../../../.data/pglite', import.meta.url));
const driverOf = new WeakMap<Db, 'pglite' | 'postgres'>();

/** Opens an in-process PGlite database (dataDir undefined → in memory). */
export async function createPgliteDb(dataDir?: string): Promise<Db> {
  if (dataDir) mkdirSync(dataDir, { recursive: true });
  const client = await PGlite.create(dataDir, { extensions: { btree_gist } });
  const db = drizzlePglite(client, { schema }) as unknown as Db;
  driverOf.set(db, 'pglite');
  return db;
}

/**
 * `undefined` or `pglite:<dir>` → PGlite on disk (local dev, no Docker);
 * anything else is treated as a Postgres connection string (Neon in production).
 */
export async function createDb(url?: string): Promise<Db> {
  if (!url || url.startsWith('pglite:')) {
    return createPgliteDb(url ? url.slice('pglite:'.length) : DEFAULT_PGLITE_DIR);
  }
  const db = drizzlePostgres(postgres(url, { max: 5 }), { schema }) as unknown as Db;
  driverOf.set(db, 'postgres');
  return db;
}

export async function migrateDb(db: Db): Promise<void> {
  const config = { migrationsFolder: MIGRATIONS };
  // biome-ignore lint/suspicious/noExplicitAny: each migrator needs its own driver-specific db type
  const anyDb = db as any;
  if (driverOf.get(db) === 'postgres') await migratePostgres(anyDb, config);
  else await migratePglite(anyDb, config);
}
