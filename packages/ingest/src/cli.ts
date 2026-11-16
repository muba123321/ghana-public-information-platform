import { parseArgs } from 'node:util';
import { closeDb, migrateDb, openDb } from '@gpip/db/node';
import { allAdapters, FIXTURES_DIR, fixtureGetter } from './adapters/index.ts';
import { runImport } from './pipeline.ts';
import { importRegional } from './regional.ts';

const { values } = parseArgs({
  options: { source: { type: 'string' }, fixtures: { type: 'boolean', default: false } },
});

const db = await openDb();
await migrateDb(db);
const today = new Date().toISOString().slice(0, 10);
const adapters = allAdapters({ fixtures: values.fixtures }).filter(
  (a) => !values.source || a.sourceKey === values.source,
);
const regional = !values.source || values.source === 'dhs-api';
if (adapters.length === 0 && !regional) {
  console.error(`Unknown source: ${values.source}`);
  await closeDb(db);
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
if (regional) {
  const r = await importRegional(db, {
    today,
    ...(values.fixtures ? { get: fixtureGetter(FIXTURES_DIR) } : {}),
  });
  console.log(
    `dhs-api (regional): ${r.errors.length ? 'failed' : 'ok'} — ${r.inserted} new figure(s)`,
  );
  for (const e of r.errors) console.log(`  ${e}`);
  failed ||= r.errors.length > 0;
}
await closeDb(db);
process.exit(failed ? 1 : 0);
