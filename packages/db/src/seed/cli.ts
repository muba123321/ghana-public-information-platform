import { createDb, migrateDb } from '../client.js';
import { seed } from './seed.js';

const db = await createDb(process.env.DATABASE_URL);
await migrateDb(db);
const result = await seed(db);
console.log(`seed complete: inserted ${result.inserted}, updated ${result.updated}`);
process.exit(0);
