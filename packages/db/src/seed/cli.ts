import { closeDb, migrateDb, openDb, seed } from '../node.ts';

const db = await openDb();
await migrateDb(db);
const result = await seed(db);
console.log(
  `seed complete: inserted ${result.inserted}, updated ${result.updated}, deleted ${result.deleted}`,
);
await closeDb(db);
process.exit(0);
