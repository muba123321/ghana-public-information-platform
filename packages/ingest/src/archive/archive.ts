import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { extname } from 'node:path';
import { type Db, documents, eq, sources } from '@gpip/db';
import { createLocalStore } from './local.ts';
import { createR2Store } from './r2.ts';
import { type Lookup, safeDownload } from './safe-url.ts';
import type { DocumentStore } from './store.ts';

/**
 * R2 when configured (production), otherwise a local folder: `GPIP_ARCHIVE_DIR`, or `localDir`
 * (callers pass their own default so no file path is resolved from this module's location —
 * the web bundler cannot follow those).
 */
export function storeFromEnv(
  env: NodeJS.ProcessEnv = process.env,
  localDir?: string,
): DocumentStore {
  const { R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET } = env;
  if (R2_ACCOUNT_ID && R2_ACCESS_KEY_ID && R2_SECRET_ACCESS_KEY && R2_BUCKET) {
    return createR2Store({
      accountId: R2_ACCOUNT_ID,
      accessKeyId: R2_ACCESS_KEY_ID,
      secretAccessKey: R2_SECRET_ACCESS_KEY,
      bucket: R2_BUCKET,
    });
  }
  const dir = env.GPIP_ARCHIVE_DIR ?? localDir;
  if (!dir) throw new Error('No archive configured: set R2_* or GPIP_ARCHIVE_DIR');
  return createLocalStore(dir);
}

const MIME: Record<string, string> = {
  '.pdf': 'application/pdf',
  '.txt': 'text/plain',
  '.html': 'text/html',
  '.htm': 'text/html',
};
const EXT: Record<string, string> = {
  'application/pdf': 'pdf',
  'text/plain': 'txt',
  'text/html': 'html',
};

/** True when the bytes start with the PDF signature. */
export const isPdf = (bytes: Uint8Array) =>
  Buffer.from(bytes.subarray(0, 5)).toString('latin1') === '%PDF-';

/** Page objects in a PDF (`/Type /Page`, not `/Pages`); null if it isn't a PDF. Good enough to validate page references. */
export function countPdfPages(bytes: Uint8Array): number | null {
  const text = Buffer.from(bytes).toString('latin1');
  if (!text.startsWith('%PDF-')) return null;
  return (text.match(/\/Type\s*\/Page(?![s\w])/g) ?? []).length || null;
}

export interface ArchiveInput {
  url?: string;
  file?: string;
  /** Bytes uploaded through the admin screen; the filename gives the type. */
  upload?: { bytes: Uint8Array; filename: string };
  title: string;
  docType: string;
  publisher: string;
  administrationSlug?: string;
  /** Only true when the publisher's licence allows sharing copies. */
  publicRedistribution?: boolean;
  fetchImpl?: typeof fetch;
  /** DNS lookup override (tests). */
  lookup?: Lookup;
}

async function download(
  url: string,
  fetchImpl: typeof fetch,
  lookup?: Lookup,
): Promise<{ bytes: Uint8Array; mime: string }> {
  const res = await safeDownload(url, { fetchImpl, ...(lookup ? { lookup } : {}) });
  if (!res.ok) throw new Error(`GET ${url} failed: HTTP ${res.status}`);
  const mime =
    (res.headers.get('content-type') ?? '').split(';')[0]?.trim() ||
    MIME[extname(new URL(url).pathname)] ||
    'application/octet-stream';
  return { bytes: new Uint8Array(await res.arrayBuffer()), mime };
}

/** Archives an original once (by SHA-256) and records it with its publisher as the source. */
export async function archiveDocument(
  db: Db,
  store: DocumentStore,
  input: ArchiveInput,
): Promise<{ documentId: string; duplicate: boolean }> {
  const given = [input.url, input.file, input.upload].filter((x) => x !== undefined).length;
  if (given !== 1) throw new Error('Give exactly one of url, file or upload');
  const mimeOf = (name: string) => MIME[extname(name).toLowerCase()] ?? 'application/octet-stream';
  const { bytes, mime } = input.url
    ? await download(input.url, input.fetchImpl ?? fetch, input.lookup)
    : input.upload
      ? { bytes: input.upload.bytes, mime: mimeOf(input.upload.filename) }
      : {
          bytes: new Uint8Array(await readFile(input.file as string)),
          mime: mimeOf(input.file as string),
        };

  // A file that claims to be a PDF must be one: anything else could be active content.
  if (mime === 'application/pdf' && !isPdf(bytes)) throw new Error('This file is not a PDF');

  const sha256 = createHash('sha256').update(bytes).digest('hex');
  const [existing] = await db
    .select({ id: documents.id })
    .from(documents)
    .where(eq(documents.sha256, sha256));
  if (existing) return { documentId: existing.id, duplicate: true };

  const storageKey = `documents/${sha256}.${EXT[mime] ?? 'bin'}`;
  await store.put(storageKey, bytes, mime);
  const today = new Date().toISOString().slice(0, 10);
  const sourceUrl =
    input.url ??
    `https://github.com/muba123321/ghana-public-information-platform#archived-${sha256.slice(0, 12)}`;

  return db.transaction(async (tx) => {
    const [src] = await tx
      .insert(sources)
      .values({
        publisher: input.publisher,
        title: input.title,
        url: sourceUrl,
        sourceType:
          input.docType === 'manifesto'
            ? 'manifesto'
            : input.docType === 'budget_statement'
              ? 'budget_statement'
              : 'report',
        retrievedOn: today,
        archiveKey: storageKey,
        sha256,
      })
      .onConflictDoUpdate({
        target: [sources.url, sources.title],
        set: { archiveKey: storageKey, sha256 },
      })
      .returning({ id: sources.id });
    if (!src) throw new Error('could not record source');
    const [doc] = await tx
      .insert(documents)
      .values({
        sourceId: src.id,
        title: input.title,
        docType: input.docType,
        administrationSlug: input.administrationSlug ?? null,
        pages: mime === 'application/pdf' ? countPdfPages(bytes) : null,
        mime,
        sha256,
        storageKey,
        bytes: bytes.byteLength,
        publicRedistribution: input.publicRedistribution ?? false,
      })
      .returning({ id: documents.id });
    if (!doc) throw new Error('could not record document');
    return { documentId: doc.id, duplicate: false };
  });
}
