import 'server-only';
import { resolve } from 'node:path';
import { closeDb, createDb, type Db } from '@gpip/db';

/**
 * Kept on globalThis: Next.js may bundle instrumentation (which closes the database on shutdown)
 * separately from the pages, and both must see the same connection.
 */
const shared = globalThis as typeof globalThis & { __gpipDb?: Promise<Db> | undefined };

/**
 * One shared connection per server process. Without DATABASE_URL, uses the repo-root local PGlite
 * database that `pnpm db:seed` fills (next runs with cwd = apps/web).
 */
export function getDb(): Promise<Db> {
  if (!shared.__gpipDb) {
    const opening = createDb(
      process.env.DATABASE_URL ?? `pglite:${resolve(process.cwd(), '../../.data/pglite')}`,
    );
    shared.__gpipDb = opening;
    // A failed open is retried on the next request instead of being cached forever.
    opening.catch(() => {
      if (shared.__gpipDb === opening) shared.__gpipDb = undefined;
    });
  }
  return shared.__gpipDb;
}

/** Closes the shared connection if one is open (used on shutdown). */
export async function closeSharedDb(): Promise<void> {
  const pending = shared.__gpipDb;
  shared.__gpipDb = undefined;
  if (pending) await closeDb(await pending);
}
