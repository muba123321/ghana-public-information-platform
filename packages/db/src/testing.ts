import { createPgliteDb, type Db, migrateDb } from './client.js';

/** Fresh, migrated in-memory database for a test. */
export async function createTestDb(): Promise<Db> {
  const db = await createPgliteDb();
  await migrateDb(db);
  return db;
}
