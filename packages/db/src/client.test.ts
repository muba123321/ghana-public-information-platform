import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { sql } from 'drizzle-orm';
import { expect, it } from 'vitest';
import { closeDb, createDb } from './client.ts';
import { DEFAULT_PGLITE_DIR } from './node.ts';

it('creates missing parent directories for an on-disk PGlite database', async () => {
  const dir = join(mkdtempSync(join(tmpdir(), 'gpip-')), 'nested', 'db');
  const db = await createDb(`pglite:${dir}`);
  await expect(db.execute(sql`select 1`)).resolves.toBeDefined();
});

it('anchors the default database at the repository root, not the working directory', () => {
  expect(DEFAULT_PGLITE_DIR).toMatch(/\/\.data\/pglite$/);
  expect(DEFAULT_PGLITE_DIR.includes('/packages/')).toBe(false);
});

it('closes an on-disk database cleanly so it reopens without crash recovery', async () => {
  const dir = join(mkdtempSync(join(tmpdir(), 'gpip-close-')), 'db');
  const db = await createDb(`pglite:${dir}`);
  await db.execute(sql`create table t (n int)`);
  await db.execute(sql`insert into t values (1)`);
  await closeDb(db);
  await closeDb(db); // closing twice is harmless
  const again = await createDb(`pglite:${dir}`);
  const r = (await again.execute(sql`select count(*)::int as n from t`)) as unknown as {
    rows: { n: number }[];
  };
  expect(r.rows[0]?.n).toBe(1);
  await closeDb(again);
});
