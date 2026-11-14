/**
 * e2e data (run before `next start`, PGlite is single-process): one archived PDF, two drafts
 * queued through the session-extraction path, and one published commitment held by two governments.
 */
import {
  commitmentBudgets,
  commitmentStewardships,
  commitments,
  documents,
  eq,
  sources,
} from '@gpip/db';
import { migrateDb, openDb } from '@gpip/db/node';
import { archiveDocument, createLocalStore, queueExtraction } from '@gpip/ingest';

const PDF = Buffer.from(
  '%PDF-1.4\n1 0 obj <</Type /Catalog /Pages 2 0 R>> endobj\n2 0 obj <</Type /Pages /Kids [3 0 R 4 0 R] /Count 2>> endobj\n3 0 obj <</Type /Page /Parent 2 0 R>> endobj\n4 0 obj <</Type /Page /Parent 2 0 R>> endobj\ntrailer <</Root 1 0 R>>\n%%EOF',
);

const archiveDir = process.env.GPIP_ARCHIVE_DIR;
if (!archiveDir) throw new Error('GPIP_ARCHIVE_DIR is required');
const db = await openDb();
await migrateDb(db);

const { documentId } = await archiveDocument(db, createLocalStore(archiveDir), {
  upload: { bytes: new Uint8Array(PDF), filename: 'test-manifesto.pdf' },
  title: 'Test Manifesto 2012',
  docType: 'manifesto',
  publisher: 'Test Party',
  administrationSlug: '2013-mahama-i',
});

await queueExtraction(
  db,
  documentId,
  {
    commitments: [
      {
        wording: 'We will build 200 community day schools.',
        page: 1,
        kind: 'campaign_promise',
        sectorSlug: 'education',
      },
      { wording: 'We will make Ghana great again.', page: 2, kind: 'campaign_promise' },
    ],
  },
  { model: 'claude-code-session', promptVersion: 'v1' },
);

const [doc] = await db
  .select({ sourceId: documents.sourceId })
  .from(documents)
  .where(eq(documents.id, documentId));
const [src] = await db
  .select({ id: sources.id })
  .from(sources)
  .where(eq(sources.id, doc!.sourceId));
await db.insert(commitments).values({
  slug: 'e2e-eastern-corridor',
  wording: 'We will complete the Eastern Corridor road from Tema to Bawku.',
  documentId,
  page: 2,
  kind: 'funded_project',
  originatingAdministrationSlug: '2013-mahama-i',
  sectorSlug: 'infrastructure',
  finalStatus: 'completed',
  reviewStatus: 'published',
  provenance: 'manual',
});
await db.insert(commitmentStewardships).values([
  {
    commitmentSlug: 'e2e-eastern-corridor',
    administrationSlug: '2013-mahama-i',
    progressAtStart: 0,
    progressAtEnd: 40,
    status: 'in_progress',
  },
  {
    commitmentSlug: 'e2e-eastern-corridor',
    administrationSlug: '2017-akufo-addo-i',
    progressAtStart: 40,
    progressAtEnd: 100,
    status: 'completed',
  },
]);
await db.insert(commitmentBudgets).values([
  {
    commitmentSlug: 'e2e-eastern-corridor',
    kind: 'allocated',
    amount: 1_200_000_000,
    currency: 'GHS',
    fiscalYear: 2016,
    sourceId: src!.id,
    provenance: 'manual',
    reviewStatus: 'published',
  },
  {
    commitmentSlug: 'e2e-eastern-corridor',
    kind: 'allocated',
    amount: 90_000_000,
    currency: 'USD',
    fiscalYear: 2018,
    sourceId: src!.id,
    provenance: 'manual',
    reviewStatus: 'published',
  },
]);
console.log('e2e fixtures loaded');
process.exit(0);
