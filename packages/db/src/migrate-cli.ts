import { migrateDb, openDb } from './node.ts';

await migrateDb(await openDb());
console.log('migrations applied');
process.exit(0);
