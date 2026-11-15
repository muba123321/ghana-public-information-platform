import { parseArgs } from 'node:util';
import { closeDb, migrateDb, openDb } from '@gpip/db/node';
import { LOCAL_ARCHIVE_DIR } from '../paths.ts';
import { archiveDocument, storeFromEnv } from './archive.ts';

const { values } = parseArgs({
  options: {
    url: { type: 'string' },
    file: { type: 'string' },
    title: { type: 'string' },
    type: { type: 'string', default: 'manifesto' },
    publisher: { type: 'string' },
    administration: { type: 'string' },
    'public-redistribution': { type: 'boolean', default: false },
  },
});
if (!values.title || !values.publisher || !values.url) {
  console.error(
    'Usage: pnpm archive --url <publisher url> [--file <local copy>] --title <title> --publisher <name> [--type manifesto|budget_statement|report] [--administration <slug>] [--public-redistribution]',
  );
  process.exit(2);
}

const db = await openDb();
await migrateDb(db);
const r = await archiveDocument(db, storeFromEnv(process.env, LOCAL_ARCHIVE_DIR), {
  // --url is always the cited source; --file archives a local copy instead of downloading it.
  ...(values.file ? { file: values.file, sourceUrl: values.url } : { url: values.url }),
  title: values.title,
  docType: values.type ?? 'manifesto',
  publisher: values.publisher,
  ...(values.administration ? { administrationSlug: values.administration } : {}),
  publicRedistribution: values['public-redistribution'] ?? false,
});
console.log(
  r.duplicate ? `Already archived: document ${r.documentId}` : `Archived: document ${r.documentId}`,
);
await closeDb(db);
process.exit(0);
