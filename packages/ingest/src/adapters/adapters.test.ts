import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { fixtureGetter } from './fixtures.ts';
import { createImfAdapter } from './imf.ts';
import { createWorldBankAdapter } from './worldbank.ts';

const FIXTURES = fileURLToPath(new URL('../../fixtures', import.meta.url));
const get = fixtureGetter(FIXTURES);
const ctx = { today: '2026-11-10', defaultEstimateType: 'reported' as const };

describe('World Bank adapter', () => {
  it('follows every page and skips years with no value', async () => {
    const points = await createWorldBankAdapter(get).fetch('FP.CPI.TOTL.ZG', ctx);
    expect(points).toHaveLength(61);
    expect(points.map((p) => p.year).sort()[0]).toBe('1965');
    expect(points.every((p) => p.value !== null && p.estimateType === 'reported')).toBe(true);
  });

  it('tags values with the catalogue estimate type', async () => {
    const points = await createWorldBankAdapter(get).fetch('FP.CPI.TOTL.ZG', {
      ...ctx,
      defaultEstimateType: 'modelled',
    });
    expect(new Set(points.map((p) => p.estimateType))).toEqual(new Set(['modelled']));
  });

  it('keeps sparse survey series sparse', async () => {
    expect(await createWorldBankAdapter(get).fetch('SI.POV.DDAY', ctx)).toHaveLength(7);
  });

  it('turns an API error payload into an error', async () => {
    const error = createWorldBankAdapter(async () =>
      get(
        'https://api.worldbank.org/v2/country/GHA/indicator/error-invalid-code?format=json&page=1',
      ),
    );
    await expect(error.fetch('NOT.A.CODE', ctx)).rejects.toThrow(/not valid/);
  });

  it('requests Ghana with the series code and page', async () => {
    const urls: string[] = [];
    await createWorldBankAdapter(async (u) => {
      urls.push(u);
      return [{ page: 1, pages: 1 }, []];
    }).fetch('SP.POP.TOTL', ctx);
    expect(urls).toEqual([
      'https://api.worldbank.org/v2/country/GHA/indicator/SP.POP.TOTL?format=json&per_page=100&page=1',
    ]);
  });
});

describe('IMF adapters', () => {
  it('reads only Ghana and marks WEO years from the current year as projections', async () => {
    const points = await createImfAdapter('imf-weo', get).fetch('GGXWDG_NGDP', ctx);
    const byYear = new Map(points.map((p) => [p.year, p]));
    expect(byYear.get('2031')?.estimateType).toBe('projected');
    expect(byYear.get('2026')?.estimateType).toBe('projected');
    expect(byYear.get('2025')?.estimateType).toBe('reported');
    expect(points[0]!.year).toBe('1990');
    expect(points).toHaveLength(42);
  });

  it('never marks the historical FPP dataset as projected', async () => {
    const points = await createImfAdapter('imf-fpp', get).fetch('rev', ctx);
    expect(points.find((p) => p.year === '2024')?.estimateType).toBe('reported');
    expect(points.every((p) => p.estimateType === 'reported')).toBe(true);
  });

  it('returns nothing when Ghana is absent', async () => {
    expect(
      await createImfAdapter('imf-fpp', async () => ({
        values: { rev: { SDN: { '2020': 1 } } },
      })).fetch('rev', ctx),
    ).toEqual([]);
  });
});

describe('fixtureGetter', () => {
  it('returns an empty series for a code with no fixture', async () => {
    expect(await createWorldBankAdapter(get).fetch('NO.FIXTURE', ctx)).toEqual([]);
    expect(await createImfAdapter('imf-weo', get).fetch('NOFIXTURE', ctx)).toEqual([]);
  });
});

describe('malformed upstream rows', () => {
  it('skips World Bank rows with a bad year or non-numeric value', async () => {
    const wb = createWorldBankAdapter(async () => [
      { page: 1, pages: 1 },
      [
        { date: '2020', value: 1.5 },
        { date: '2021Q1', value: 2 },
        { date: '2022', value: 'n/a' },
        { date: '2023', value: null },
      ],
    ]);
    expect(await wb.fetch('X', ctx)).toEqual([
      { year: '2020', value: 1.5, estimateType: 'reported' },
    ]);
  });

  it('skips non-numeric IMF values', async () => {
    const imf = createImfAdapter('imf-fpp', async () => ({
      values: { rev: { GHA: { '2020': 12, '2021': 'x' } } },
    }));
    expect((await imf.fetch('rev', ctx)).map((p) => p.year)).toEqual(['2020']);
  });
});

describe('WEO edition boundary', () => {
  it('still treats last year as projected in January–April (the October edition is current)', async () => {
    const imf = createImfAdapter('imf-weo', async () => ({
      values: { X: { GHA: { '2025': 1, '2026': 2, '2027': 3 } } },
    }));
    const jan = await imf.fetch('X', { ...ctx, today: '2027-01-15' });
    expect(jan.map((p) => [p.year, p.estimateType])).toEqual([
      ['2025', 'reported'],
      ['2026', 'projected'],
      ['2027', 'projected'],
    ]);
    const may = await imf.fetch('X', { ...ctx, today: '2027-05-20' });
    expect(may.find((p) => p.year === '2026')?.estimateType).toBe('reported');
  });
});
