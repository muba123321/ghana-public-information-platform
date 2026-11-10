import { and, eq, type SQL } from 'drizzle-orm';
import type { PgTable } from 'drizzle-orm/pg-core';
import type { Db } from '../client.js';
import { changeLog } from '../schema/index.js';

export type Tx = Parameters<Parameters<Db['transaction']>[0]>[0];
export interface SyncResult {
  inserted: number;
  updated: number;
}

type Row = Record<string, unknown>;

const same = (a: unknown, b: unknown) => (a ?? null) === (b ?? null);

/**
 * Makes `table` contain `rows` (matched on `keyCols`): inserts missing rows, updates rows whose
 * seeded columns differ, leaves identical rows untouched, and appends every change to change_log.
 * Rows not in `rows` are never deleted — seed data only grows or is corrected.
 */
export async function syncRows(
  tx: Tx,
  table: PgTable,
  tableName: string,
  keyCols: readonly string[],
  rows: readonly Row[],
): Promise<SyncResult> {
  // biome-ignore lint/suspicious/noExplicitAny: column lookup by name across heterogeneous tables
  const cols = table as any;
  const keyOf = (r: Row) => keyCols.map((c) => String(r[c])).join('|');
  const existing = new Map(((await tx.select().from(table)) as Row[]).map((r) => [keyOf(r), r]));
  const result: SyncResult = { inserted: 0, updated: 0 };

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
    const where = and(...keyCols.map((c) => eq(cols[c], row[c]))) as SQL;
    await tx.update(table).set(row).where(where);
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
