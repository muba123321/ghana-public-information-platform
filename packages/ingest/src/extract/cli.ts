import { readFile } from 'node:fs/promises';
import { parseArgs } from 'node:util';
import Anthropic from '@anthropic-ai/sdk';
import { migrateDb, openDb } from '@gpip/db/node';
import { storeFromEnv } from '../archive/archive.ts';
import { extractCommitments, PROMPT_VERSION } from './extract.ts';
import { queueExtraction } from './queue.ts';

const { values } = parseArgs({
  options: { document: { type: 'string' }, 'from-json': { type: 'string' } },
});
if (!values.document) {
  console.error('Usage: pnpm extract --document <id> [--from-json <file>]');
  console.error(
    '  Without --from-json, calls the Claude API (needs ANTHROPIC_API_KEY or `ant auth login`).',
  );
  console.error(
    '  With --from-json, queues an extraction prepared in a Claude Code session (no API cost).',
  );
  process.exit(2);
}

const db = await openDb();
await migrateDb(db);
const r = values['from-json']
  ? await queueExtraction(
      db,
      values.document,
      JSON.parse(await readFile(values['from-json'], 'utf8')),
      {
        model: 'claude-code-session',
        promptVersion: PROMPT_VERSION,
      },
    )
  : await extractCommitments(
      db,
      { client: new Anthropic(), store: storeFromEnv() },
      values.document,
    );

console.log(
  `${r.status}: ${r.found} found, ${r.queued} queued for review (run ${r.runId})${r.error ? ` — ${r.error}` : ''}`,
);
process.exit(r.status === 'ok' ? 0 : 1);
