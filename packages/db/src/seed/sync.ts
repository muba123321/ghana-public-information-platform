import { and, eq, type SQL } from 'drizzle-orm';
import type { PgTable } from 'drizzle-orm/pg-core';
import type { Db } from '../client.ts';
import { changeLog } from '../schema/index.ts';

export type Tx = Parameters<Parameters<Db['transaction']>[0]>[0];
export interface SyncResult {
  inserted: number;
  updated: number;
  deleted: number;
}

type Row = Record<string, unknown>;

const same = (a: unknown, b: unknown) => (a ?? null) === (b ?? null);

/**
 * Makes `table` contain `rows` (matched on `keyCols`): inserts missing rows, updates rows whose
 * seeded columns differ, leaves identical rows untouched, and appends every change to change_log.
 * With `prune`, rows absent from `rows` are deleted (and logged): use it for tables the seed owns
 * completely, where a corrected natural key would otherwise leave a stale duplicate behind.
 * With `retire`, absent rows are instead updated with those values (e.g. unpublished).
 */
export async function syncRows(
  tx: Tx,
  table: PgTable,
  tableName: string,
  keyCols: readonly string[],
  rows: readonly Row[],
  { prune = false, retire }: { prune?: boolean; retire?: Row } = {},
): Promise<SyncResult> {
  // biome-ignore lint/suspicious/noExplicitAny: column lookup by name across heterogeneous tables
  const cols = table as any;
  const keyOf = (r: Row) => keyCols.map((c) => String(r[c])).join('|');
  const existing = new Map(((await tx.select().from(table)) as Row[]).map((r) => [keyOf(r), r]));
  const result: SyncResult = { inserted: 0, updated: 0, deleted: 0 };
  const whereKey = (r: Row) => and(...keyCols.map((c) => eq(cols[c], r[c]))) as SQL;

  const wanted = new Set(rows.map(keyOf));
  if (retire) {
    // Rows other records depend on (e.g. observations) are retired, not deleted.
    for (const [key, before] of existing) {
      if (wanted.has(key) || Object.keys(retire).every((c) => same(retire[c], before[c]))) continue;
      await tx.update(table).set(retire).where(whereKey(before));
      await tx.insert(changeLog).values({
        entityTable: tableName,
        entityKey: key,
        action: 'update',
        before,
        after: { ...before, ...retire },
        changedBy: 'seed',
      });
      result.updated++;
    }
  }
  if (prune) {
    for (const [key, before] of existing) {
      if (wanted.has(key)) continue;
      await tx.delete(table).where(whereKey(before));
      await tx.insert(changeLog).values({
        entityTable: tableName,
        entityKey: key,
        action: 'delete',
        before,
        changedBy: 'seed',
      });
      result.deleted++;
    }
  }

  for (const row of rows) {
    const key = keyOf(row);
    const before = existing.get(key);
    if (!before) {
      await tx.insert(table).values(row);
      await tx.insert(changeLog).values({
        entityTable: tableName,
        entityKey: key,
        action: 'insert',
        after: row,
        changedBy: 'seed',
      });
      result.inserted++;
      continue;
    }
    if (Object.keys(row).every((c) => same(row[c], before[c]))) continue;
    await tx.update(table).set(row).where(whereKey(row));
    await tx.insert(changeLog).values({
      entityTable: tableName,
      entityKey: key,
      action: 'update',
      before,
      after: row,
      changedBy: 'seed',
    });
    result.updated++;
  }
  return result;
}
