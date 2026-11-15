import { beforeAll, describe, expect, it } from 'vitest';
import type { Db } from '../client.ts';
import { sectors } from '../schema/index.ts';
import { seed } from '../seed/seed.ts';
import { createTestDb } from '../testing.ts';
import { listSectors } from './sectors.ts';

let db: Db;
beforeAll(async () => {
  db = await createTestDb();
  await seed(db);
});

describe('listSectors', () => {
  it('lists every sector by name', async () => {
    const list = await listSectors(db);
    expect(list).toHaveLength(await db.$count(sectors));
    const names = list.map((s) => s.name);
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)));
    expect(list[0]).toEqual({ slug: expect.any(String), name: expect.any(String) });
  });
});
