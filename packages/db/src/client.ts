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
const closers = new WeakMap<Db, () => Promise<void>>();

export function dbDriver(db: Db): Driver {
  return driverOf.get(db) ?? 'postgres';
}

/** Opens an in-process PGlite database (dataDir undefined → in memory). */
export async function createPgliteDb(dataDir?: string): Promise<Db> {
  if (dataDir) mkdirSync(dataDir, { recursive: true });
  const client = await PGlite.create(dataDir, { extensions: { btree_gist } });
  const db = drizzlePglite(client, { schema }) as unknown as Db;
  driverOf.set(db, 'pglite');
  closers.set(db, () => client.close());
  return db;
}

/**
 * `pglite:<dir>` → PGlite on disk (local dev, no Docker); anything else is a Postgres connection
 * string (Neon in production).
 */
export async function createDb(url: string): Promise<Db> {
  if (url.startsWith('pglite:')) return createPgliteDb(url.slice('pglite:'.length));
  const client = postgres(url, { max: 5 });
  const db = drizzlePostgres(client, { schema }) as unknown as Db;
  driverOf.set(db, 'postgres');
  closers.set(db, () => client.end({ timeout: 5 }));
  return db;
}

/**
 * Closes the connection. For on-disk PGlite this is essential: a process that exits mid-checkpoint
 * leaves a database PostgreSQL cannot recover ("could not locate a valid checkpoint record").
 * Every CLI calls this before exiting; the web server calls it on SIGINT/SIGTERM. Idempotent.
 */
export async function closeDb(db: Db): Promise<void> {
  const close = closers.get(db);
  if (!close) return;
  closers.delete(db);
  await close();
}
