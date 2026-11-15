import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  commitmentBudgets,
  commitments,
  type Db,
  documents,
  eq,
  extractionRuns,
  sources,
} from '@gpip/db';
import { seed } from '@gpip/db/node';
import { createTestDb } from '@gpip/db/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { createLocalStore } from '../archive/local.ts';
import { type ExtractClient, extractCommitments } from './extract.ts';
import { queueExtraction } from './queue.ts';

let db: Db;
let documentId: string;
const store = createLocalStore(mkdtempSync(join(tmpdir(), 'gpip-extract-')));

beforeEach(async () => {
  db = await createTestDb();
  await seed(db);
  const [src] = await db
    .insert(sources)
    .values({
      publisher: 'NPP',
      title: '2016 Manifesto',
      url: 'https://example.org/npp-2016.pdf',
      sourceType: 'manifesto',
      retrievedOn: '2026-11-14',
    })
    .returning();
  await store.put(
    'documents/x.pdf',
    new Uint8Array(Buffer.from('%PDF-1.4 fake')),
    'application/pdf',
  );
  const [doc] = await db
    .insert(documents)
    .values({
      sourceId: src!.id,
      title: 'NPP 2016 Manifesto',
      docType: 'manifesto',
      administrationSlug: '2017-akufo-addo-i',
      pages: 50,
      mime: 'application/pdf',
      sha256: 'f'.repeat(64),
      storageKey: 'documents/x.pdf',
      bytes: 13,
    })
    .returning();
  documentId = doc!.id;
});

const item = (wording: string, page: number, extra: object = {}) => ({
  wording,
  page,
  kind: 'campaign_promise',
  ...extra,
});
const drafts = () => db.select().from(commitments).where(eq(commitments.documentId, documentId));

describe('queueExtraction (shared by the API and Claude Code session paths)', () => {
  it('queues valid items as drafts for the document’s administration', async () => {
    const r = await queueExtraction(
      db,
      documentId,
      {
        commitments: [
          item('One District, One Factory.', 12, { sectorSlug: 'economy' }),
          item('Free senior high school.', 20),
        ],
      },
      { model: 'claude-code-session', promptVersion: 'v1' },
    );
    expect(r).toMatchObject({ status: 'ok', found: 2, queued: 2 });
    const rows = await drafts();
    expect(
      rows.every(
        (c) =>
          c.reviewStatus === 'draft' &&
          c.provenance === 'ai_extracted' &&
          c.originatingAdministrationSlug === '2017-akufo-addo-i',
      ),
    ).toBe(true);
    expect(rows.find((c) => c.page === 12)?.sectorSlug).toBe('economy');
    const [run] = await db.select().from(extractionRuns);
    expect(run).toMatchObject({
      model: 'claude-code-session',
      status: 'ok',
      itemsFound: 2,
      itemsQueued: 2,
      costUsd: 0,
    });
  });

  it('drops out-of-range pages and duplicates, including ones already queued', async () => {
    await queueExtraction(
      db,
      documentId,
      { commitments: [item('Free senior high school.', 20)] },
      { model: 'm', promptVersion: 'v1' },
    );
    const r = await queueExtraction(
      db,
      documentId,
      {
        commitments: [
          item('Free  Senior High School!', 21),
          item('Beyond the document.', 51),
          item('New promise.', 3),
          item('new promise', 4),
        ],
      },
      { model: 'm', promptVersion: 'v1' },
    );
    expect(r).toMatchObject({ status: 'ok', found: 4, queued: 1 });
    expect(await drafts()).toHaveLength(2);
  });

  it('ignores unknown sectors rather than failing', async () => {
    await queueExtraction(
      db,
      documentId,
      { commitments: [item('Promise.', 2, { sectorSlug: 'space' })] },
      { model: 'm', promptVersion: 'v1' },
    );
    expect((await drafts())[0]?.sectorSlug).toBeNull();
  });

  it('queues a stated budget as a draft allocation in its own currency', async () => {
    await queueExtraction(
      db,
      documentId,
      {
        commitments: [
          item('US$1m per constituency.', 9, {
            budget: { amount: 1_000_000, currency: 'USD', note: 'per constituency per year' },
          }),
        ],
      },
      { model: 'm', promptVersion: 'v1' },
    );
    const [b] = await db.select().from(commitmentBudgets);
    expect(b).toMatchObject({
      kind: 'allocated',
      amount: 1_000_000,
      currency: 'USD',
      reviewStatus: 'draft',
    });
  });

  it('fails the run and queues nothing for an invalid file', async () => {
    const r = await queueExtraction(
      db,
      documentId,
      { commitments: [{ wording: '', page: 0 }] },
      { model: 'm', promptVersion: 'v1' },
    );
    expect(r.status).toBe('failed');
    expect(await drafts()).toHaveLength(0);
  });
});

function fakeClient(message: object, seen: unknown[] = []): ExtractClient {
  return {
    beta: {
      messages: {
        stream: (params: unknown) => {
          seen.push(params);
          return { finalMessage: async () => message };
        },
      },
    },
  } as unknown as ExtractClient;
}

const reply = (payload: object, stop_reason = 'end_turn') => ({
  stop_reason,
  content: [{ type: 'text', text: JSON.stringify(payload) }],
  usage: { input_tokens: 250_000, output_tokens: 20_000 },
});

describe('extractCommitments (Claude API)', () => {
  it('sends the PDF first to Claude Opus 5.5 with high effort and the refusal fallback', async () => {
    const seen: unknown[] = [];
    const r = await extractCommitments(
      db,
      { client: fakeClient(reply({ commitments: [item('Promise A.', 5)] }), seen), store },
      documentId,
    );
    expect(r).toMatchObject({ status: 'ok', queued: 1 });
    const p = seen[0] as Record<string, any>;
    expect(p.model).toBe('claude-opus-5-5');
    expect(p.output_config.effort).toBe('high');
    expect(p.betas).toContain('server-side-fallback-2026-07-01');
    expect(p.fallbacks).toBe('default');
    expect(p.messages[0].content[0]).toMatchObject({
      type: 'document',
      source: { type: 'base64', media_type: 'application/pdf' },
    });
    const [run] = await db.select().from(extractionRuns);
    expect(run).toMatchObject({
      model: 'claude-opus-5-5',
      inputTokens: 250_000,
      outputTokens: 20_000,
      costUsd: 1.4,
    });
  });

  it.each([['refusal'], ['max_tokens']])(
    'fails without queueing when the model stops with %s',
    async (stop) => {
      const r = await extractCommitments(
        db,
        { client: fakeClient(reply({ commitments: [item('X.', 1)] }, stop)), store },
        documentId,
      );
      expect(r.status).toBe('failed');
      expect(r.error).toContain(stop);
      expect(await drafts()).toHaveLength(0);
    },
  );

  it('fails on malformed JSON', async () => {
    const msg = {
      stop_reason: 'end_turn',
      content: [{ type: 'text', text: '{"commitments": [' }],
      usage: { input_tokens: 1, output_tokens: 1 },
    };
    expect(
      (await extractCommitments(db, { client: fakeClient(msg), store }, documentId)).status,
    ).toBe('failed');
  });
});
