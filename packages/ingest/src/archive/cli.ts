import { parseArgs } from 'node:util';
import { migrateDb, openDb } from '@gpip/db/node';
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
if (!values.title || !values.publisher || !values.url === !values.file) {
  console.error(
    'Usage: pnpm archive (--url <url> | --file <path>) --title <title> --publisher <name> [--type manifesto|budget_statement|report] [--administration <slug>] [--public-redistribution]',
  );
  process.exit(2);
}

const db = await openDb();
await migrateDb(db);
const r = await archiveDocument(db, storeFromEnv(), {
  ...(values.url ? { url: values.url } : { file: values.file as string }),
  title: values.title,
  docType: values.type ?? 'manifesto',
  publisher: values.publisher,
  ...(values.administration ? { administrationSlug: values.administration } : {}),
  publicRedistribution: values['public-redistribution'] ?? false,
});
console.log(
  r.duplicate ? `Already archived: document ${r.documentId}` : `Archived: document ${r.documentId}`,
);
process.exit(0);
