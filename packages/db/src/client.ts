import { mkdirSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
import { btree_gist } from '@electric-sql/pglite/contrib/btree_gist';
import type { PgDatabase, PgQueryResultHKT } from 'drizzle-orm/pg-core';
import { drizzle as drizzlePglite } from 'drizzle-orm/pglite';
import { drizzle as drizzlePostgres } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema/index.ts';

export type Schema = typeof schema;
export type Db = PgDatabase<PgQueryResultHKT, Schema>;
export type Driver = 'pglite' | 'postgres';

const driverOf = new WeakMap<Db, Driver>();

export function dbDriver(db: Db): Driver {
  return driverOf.get(db) ?? 'postgres';
}

/** Opens an in-process PGlite database (dataDir undefined → in memory). */
export async function createPgliteDb(dataDir?: string): Promise<Db> {
  if (dataDir) mkdirSync(dataDir, { recursive: true });
  const client = await PGlite.create(dataDir, { extensions: { btree_gist } });
  const db = drizzlePglite(client, { schema }) as unknown as Db;
  driverOf.set(db, 'pglite');
  return db;
}

/**
 * `pglite:<dir>` → PGlite on disk (local dev, no Docker); anything else is a Postgres connection
 * string (Neon in production).
 */
export async function createDb(url: string): Promise<Db> {
  if (url.startsWith('pglite:')) return createPgliteDb(url.slice('pglite:'.length));
  const db = drizzlePostgres(postgres(url, { max: 5 }), { schema }) as unknown as Db;
  driverOf.set(db, 'postgres');
  return db;
}
