import { parseArgs } from 'node:util';
import { migrateDb, openDb } from '@gpip/db/node';
import { allAdapters } from './adapters/index.ts';
import { runImport } from './pipeline.ts';

const { values } = parseArgs({
  options: { source: { type: 'string' }, fixtures: { type: 'boolean', default: false } },
});

const db = await openDb();
await migrateDb(db);
const today = new Date().toISOString().slice(0, 10);
const adapters = allAdapters({ fixtures: values.fixtures }).filter(
  (a) => !values.source || a.sourceKey === values.source,
);
if (adapters.length === 0) {
  console.error(`Unknown source: ${values.source}`);
  process.exit(2);
}

let failed = false;
for (const adapter of adapters) {
  const r = await runImport(db, adapter, { today });
  console.log(
    `${adapter.sourceKey}: ${r.status} — ${r.indicatorsChecked} checked, ${r.vintagesWritten} new vintage(s)`,
  );
  for (const e of r.errors) console.log(`  ${e}`);
  failed ||= r.status === 'failed';
}
process.exit(failed ? 1 : 0);
