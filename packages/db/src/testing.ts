import { createPgliteDb, type Db } from './client.ts';
import { migrateDb } from './node.ts';

/** Fresh, migrated in-memory database for a test. */
export async function createTestDb(): Promise<Db> {
  const db = await createPgliteDb();
  await migrateDb(db);
  return db;
}
