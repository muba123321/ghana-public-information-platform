import type Anthropic from '@anthropic-ai/sdk';
import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod';
import { ExtractionResultSchema } from '@gpip/core';
import { type Db, documents, eq } from '@gpip/db';
import type { DocumentStore } from '../archive/store.ts';
import { PROMPT_V1 } from './prompt.ts';
import { type ExtractionOutcome, queueExtraction, type RunMeta, recordFailedRun } from './queue.ts';

export const EXTRACTION_MODEL = 'claude-opus-5-5';
export const PROMPT_VERSION = 'v1';
const PROMPT = PROMPT_V1;
/** Claude Opus 5.5 list price, USD per million tokens. */
const PRICE = { input: 4, output: 20 };

export type ExtractClient = Pick<Anthropic, 'beta'>;

export interface ExtractDeps {
  client: ExtractClient;
  store: DocumentStore;
}

/**
 * Reads one archived PDF with Claude and queues the commitments it finds as drafts.
 * The model's output is validated and never published without an editor.
 */
export async function extractCommitments(
  db: Db,
  deps: ExtractDeps,
  documentId: string,
): Promise<ExtractionOutcome> {
  const baseMeta: RunMeta = { model: EXTRACTION_MODEL, promptVersion: PROMPT_VERSION };
  const [doc] = await db.select().from(documents).where(eq(documents.id, documentId));
  if (!doc) return recordFailedRun(db, documentId, baseMeta, 'Unknown document');
  if (doc.mime !== 'application/pdf')
    return recordFailedRun(db, documentId, baseMeta, 'Only PDF documents can be extracted');
  const bytes = await deps.store.get(doc.storageKey);
  if (!bytes) return recordFailedRun(db, documentId, baseMeta, 'Archived file is missing');

  const instruction = PROMPT.replace('{{docType}}', doc.docType.replace('_', ' ')).replace(
    '{{title}}',
    doc.title,
  );
  let message: Anthropic.Beta.BetaMessage;
  try {
    const stream = deps.client.beta.messages.stream({
      model: EXTRACTION_MODEL,
      max_tokens: 64_000,
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      output_config: { effort: 'high', format: betaZodOutputFormat(ExtractionResultSchema) },
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'document',
              source: {
                type: 'base64',
                media_type: 'application/pdf',
                data: Buffer.from(bytes).toString('base64'),
              },
            },
            { type: 'text', text: instruction },
          ],
        },
      ],
    });
    message = await stream.finalMessage();
  } catch (e) {
    return recordFailedRun(
      db,
      documentId,
      baseMeta,
      `Claude API error: ${e instanceof Error ? e.message : String(e)}`,
    );
  }

  const usage = message.usage;
  const meta: RunMeta = {
    ...baseMeta,
    inputTokens: usage.input_tokens,
    outputTokens: usage.output_tokens,
    costUsd:
      Math.round(
        ((usage.input_tokens * PRICE.input + usage.output_tokens * PRICE.output) / 1e6) * 10_000,
      ) / 10_000,
  };
  if (message.stop_reason === 'refusal' || message.stop_reason === 'max_tokens') {
    return recordFailedRun(
      db,
      documentId,
      meta,
      `Model stopped with ${message.stop_reason}; nothing queued`,
    );
  }
  const text = message.content.flatMap((b) => (b.type === 'text' ? [b.text] : [])).join('');
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    return recordFailedRun(db, documentId, meta, 'Model output was not valid JSON');
  }
  return queueExtraction(db, documentId, json, meta);
}
