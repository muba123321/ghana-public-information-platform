import { type Db, importRuns, indicators, observations } from '@gpip/db';
import { seed } from '@gpip/db/node';
import { createTestDb } from '@gpip/db/testing';
import { eq } from 'drizzle-orm';
import { beforeEach, describe, expect, it } from 'vitest';
import { runImport } from './pipeline.ts';
import type { RawPoint, SourceAdapter } from './types.ts';

let db: Db;
beforeEach(async () => {
  db = await createTestDb();
  await seed(db);
});

const fake = (data: Record<string, RawPoint[] | Error>): SourceAdapter => ({
  sourceKey: 'world-bank-wdi',
  async fetch(code) {
    const d = data[code];
    if (d instanceof Error) throw d;
    return d ?? [];
  },
});

const series = (vals: (number | null)[], from = 2015): RawPoint[] =>
  vals.map((value, i) => ({ year: String(from + i), value, estimateType: 'reported' }));

const count = async (code: string) => db.$count(observations, eq(observations.indicatorCode, code));

describe('runImport', () => {
  it('writes one vintage per indicator on first run', async () => {
    const r = await runImport(db, fake({ 'FP.CPI.TOTL.ZG': series([17.2, 17.5, 12.4]) }), {
      today: '2026-11-10',
    });
    expect(r.status).toBe('ok');
    expect(r.vintagesWritten).toBe(1);
    expect(r.indicatorsChecked).toBe(
      await db.$count(indicators, eq(indicators.sourceKey, 'world-bank-wdi')),
    );
    expect(await count('inflation')).toBe(3);
  });

  it('writes nothing when the published values are unchanged', async () => {
    const a = fake({ 'FP.CPI.TOTL.ZG': series([17.2, 17.5, 12.4]) });
    await runImport(db, a, { today: '2026-11-10' });
    const r = await runImport(db, a, { today: '2026-11-17' });
    expect(r.vintagesWritten).toBe(0);
    expect(await count('inflation')).toBe(3);
  });

  it('writes a complete new vintage when one value is revised', async () => {
    await runImport(db, fake({ 'FP.CPI.TOTL.ZG': series([17.2, 17.5, 12.4]) }), {
      today: '2026-11-10',
    });
    const r = await runImport(db, fake({ 'FP.CPI.TOTL.ZG': series([17.2, 17.6, 12.4]) }), {
      today: '2026-11-17',
    });
    expect(r.vintagesWritten).toBe(1);
    expect(await count('inflation')).toBe(6);
  });

  it('keeps importing other indicators when one fails, and writes no partial rows', async () => {
    const r = await runImport(
      db,
      fake({ 'FP.CPI.TOTL.ZG': new Error('timeout'), 'NY.GDP.MKTP.KD.ZG': series([2.1, 3.4]) }),
      { today: '2026-11-10' },
    );
    expect(r.status).toBe('failed');
    expect(r.errors).toEqual([expect.stringContaining('inflation: timeout')]);
    expect(await count('inflation')).toBe(0);
    expect(await count('gdp-growth')).toBe(2);
    const [run] = await db.select().from(importRuns);
    expect(run).toMatchObject({ status: 'failed', vintagesWritten: 1 });
  });

  it('skips writing when a source returns no data', async () => {
    const r = await runImport(db, fake({}), { today: '2026-11-10' });
    expect(r).toMatchObject({ status: 'ok', vintagesWritten: 0 });
  });
});

describe('runImport with recorded World Bank data', () => {
  it('imports the full inflation series through the real adapter', async () => {
    const { fixtureGetter } = await import('./adapters/fixtures.ts');
    const { createWorldBankAdapter } = await import('./adapters/worldbank.ts');
    const dir = new URL('../fixtures', import.meta.url).pathname;
    const r = await runImport(db, createWorldBankAdapter(fixtureGetter(dir)), {
      today: '2026-11-10',
    });
    expect(r.status).toBe('ok');
    expect(await count('inflation')).toBe(61);
    expect(await count('poverty')).toBe(7);
  });
});
