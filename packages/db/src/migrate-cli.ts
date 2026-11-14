import { closeDb, migrateDb, openDb } from './node.ts';

const db = await openDb();
await migrateDb(db);
console.log('migrations applied');
await closeDb(db);
process.exit(0);
