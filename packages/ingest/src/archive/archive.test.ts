import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { type Db, documents, eq, sources } from '@gpip/db';
import { seed } from '@gpip/db/node';
import { createTestDb } from '@gpip/db/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { archiveDocument, countPdfPages } from './archive.ts';
import { createLocalStore } from './local.ts';

/** Minimal two-page PDF (enough structure for the page counter). */
const PDF = Buffer.from(
  '%PDF-1.4\n1 0 obj <</Type /Catalog /Pages 2 0 R>> endobj\n2 0 obj <</Type /Pages /Kids [3 0 R 4 0 R] /Count 2>> endobj\n3 0 obj <</Type /Page /Parent 2 0 R>> endobj\n4 0 obj <</Type/Page /Parent 2 0 R>> endobj\ntrailer <</Root 1 0 R>>\n%%EOF',
);

const publicLookup = async () => [{ address: '93.184.216.34', family: 4 }];

let db: Db;
let dir: string;
beforeEach(async () => {
  db = await createTestDb();
  await seed(db);
  dir = mkdtempSync(join(tmpdir(), 'gpip-archive-'));
});

const meta = {
  title: 'NDC 2012 Manifesto',
  docType: 'manifesto',
  publisher: 'National Democratic Congress',
  administrationSlug: '2013-mahama-i',
};

describe('archiveDocument', () => {
  it('stores a local PDF under its hash and records it with a source', async () => {
    const file = join(dir, 'm.pdf');
    writeFileSync(file, PDF);
    const store = createLocalStore(join(dir, 'store'));
    const r = await archiveDocument(db, store, { ...meta, file });
    expect(r.duplicate).toBe(false);
    const [doc] = await db.select().from(documents).where(eq(documents.id, r.documentId));
    expect(doc).toMatchObject({ pages: 2, mime: 'application/pdf', publicRedistribution: false });
    expect(doc!.storageKey).toBe(`documents/${doc!.sha256}.pdf`);
    expect(await store.get(doc!.storageKey)).toEqual(new Uint8Array(PDF));
    const [src] = await db.select().from(sources).where(eq(sources.id, doc!.sourceId));
    expect(src).toMatchObject({
      publisher: 'National Democratic Congress',
      sourceType: 'manifesto',
    });
  });

  it('archives identical bytes only once', async () => {
    const file = join(dir, 'm.pdf');
    writeFileSync(file, PDF);
    const store = createLocalStore(join(dir, 'store'));
    const a = await archiveDocument(db, store, { ...meta, file });
    const b = await archiveDocument(db, store, { ...meta, file, title: 'Same file again' });
    expect(b).toEqual({ documentId: a.documentId, duplicate: true });
    expect(await db.$count(documents)).toBe(1);
  });

  it('downloads from a URL and keeps the publisher link as the source', async () => {
    const fetchImpl = (async () =>
      new Response(PDF, {
        status: 200,
        headers: { 'content-type': 'application/pdf' },
      })) as typeof fetch;
    const r = await archiveDocument(db, createLocalStore(join(dir, 's')), {
      ...meta,
      url: 'https://example.org/m.pdf',
      fetchImpl,
    });
    const [row] = await db
      .select({ url: sources.url })
      .from(documents)
      .innerJoin(sources, eq(documents.sourceId, sources.id))
      .where(eq(documents.id, r.documentId));
    expect(row!.url).toBe('https://example.org/m.pdf');
  });

  it('records nothing when the download fails', async () => {
    const fetchImpl = (async () => new Response('gone', { status: 404 })) as typeof fetch;
    await expect(
      archiveDocument(db, createLocalStore(join(dir, 's')), {
        ...meta,
        url: 'https://example.org/x.pdf',
        fetchImpl,
      }),
    ).rejects.toThrow(/404/);
    expect(await db.$count(documents)).toBe(0);
  });

  it('accepts non-PDF files with an unknown page count', async () => {
    const file = join(dir, 'notes.txt');
    writeFileSync(file, 'plain text');
    const r = await archiveDocument(db, createLocalStore(join(dir, 's')), { ...meta, file });
    const [doc] = await db.select().from(documents).where(eq(documents.id, r.documentId));
    expect(doc).toMatchObject({ pages: null, mime: 'text/plain' });
    expect(doc!.storageKey).toMatch(/\.txt$/);
  });
});

describe('countPdfPages', () => {
  it('counts page objects but not the page tree', () => {
    expect(countPdfPages(new Uint8Array(PDF))).toBe(2);
    expect(countPdfPages(new Uint8Array(Buffer.from('not a pdf')))).toBeNull();
  });
});

describe('archiveDocument from uploaded bytes', () => {
  it('archives an upload using its filename for the type', async () => {
    const store = createLocalStore(join(dir, 'up'));
    const r = await archiveDocument(db, store, {
      ...meta,
      upload: { bytes: new Uint8Array(PDF), filename: 'Manifesto 2016.PDF' },
    });
    const [doc] = await db.select().from(documents).where(eq(documents.id, r.documentId));
    expect(doc).toMatchObject({ mime: 'application/pdf', pages: 2 });
  });

  it('requires exactly one of url, file or upload', async () => {
    await expect(archiveDocument(db, createLocalStore(join(dir, 'x')), meta)).rejects.toThrow(
      /exactly one/,
    );
  });
});

describe('archiveDocument content checks', () => {
  it('refuses a file that claims to be a PDF but is not one', async () => {
    const store = createLocalStore(join(dir, 'fake'));
    await expect(
      archiveDocument(db, store, {
        ...meta,
        upload: {
          bytes: new Uint8Array(Buffer.from('<html><script>alert(1)</script>')),
          filename: 'manifesto.pdf',
        },
      }),
    ).rejects.toThrow(/not a PDF/);
    expect(await db.$count(documents)).toBe(0);
  });
});
