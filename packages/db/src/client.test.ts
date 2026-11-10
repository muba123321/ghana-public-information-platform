import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { sql } from 'drizzle-orm';
import { expect, it } from 'vitest';
import { createDb } from './client.ts';
import { DEFAULT_PGLITE_DIR } from './node.ts';

it('creates missing parent directories for an on-disk PGlite database', async () => {
  const dir = join(mkdtempSync(join(tmpdir(), 'gpip-')), 'nested', 'db');
  const db = await createDb(`pglite:${dir}`);
  await expect(db.execute(sql`select 1`)).resolves.toBeDefined();
}, 30_000); // creating an on-disk PGlite cluster is slow while the whole suite runs in parallel

it('anchors the default database at the repository root, not the working directory', () => {
  expect(DEFAULT_PGLITE_DIR).toMatch(/\/\.data\/pglite$/);
  expect(DEFAULT_PGLITE_DIR.includes('/packages/')).toBe(false);
});
