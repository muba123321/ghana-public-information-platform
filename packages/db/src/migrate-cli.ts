import { createDb, migrateDb } from './client.js';

const db = await createDb(process.env.DATABASE_URL);
await migrateDb(db);
console.log('migrations applied');
process.exit(0);
