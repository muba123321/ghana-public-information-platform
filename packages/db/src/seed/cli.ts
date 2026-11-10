import { migrateDb, openDb, seed } from '../node.ts';

const db = await openDb();
await migrateDb(db);
const result = await seed(db);
console.log(`seed complete: inserted ${result.inserted}, updated ${result.updated}`);
process.exit(0);
