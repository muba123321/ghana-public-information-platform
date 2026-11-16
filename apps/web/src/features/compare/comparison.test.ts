import { annualPeriod, type LeaderTerm, type ObservationPoint } from '@gpip/core';
import { describe, expect, it } from 'vitest';
import { buildComparison, compareChoices, type NamedTerm } from './comparison';

const hos = (
  personSlug: string,
  fullName: string,
  startDate: string,
): LeaderTerm['leaders'][number] => ({
  role: 'head_of_state',
  personSlug,
  fullName,
  startDate,
  endDate: null,
});
const TERMS: NamedTerm[] = [
  {
    slug: '1979-afrc',
    name: 'AFRC',
    start: '1979-06-04',
    end: '1979-09-24',
    leaders: [hos('jerry-john-rawlings', 'Jerry John Rawlings', '1979-06-04')],
  },
  {
    slug: '1979-third-republic',
    name: 'Third Republic',
    start: '1979-09-24',
    end: '1981-12-31',
    leaders: [hos('hilla-limann', 'Hilla Limann', '1979-09-24')],
  },
  {
    slug: '1981-pndc',
    name: 'PNDC',
    start: '1981-12-31',
    end: '2001-01-07',
    leaders: [hos('jerry-john-rawlings', 'Jerry John Rawlings', '1981-12-31')],
  },
  {
    slug: '2001-kufuor-i',
    name: 'Kufuor I',
    start: '2001-01-07',
    end: '2005-01-07',
    leaders: [hos('john-agyekum-kufuor', 'John Agyekum Kufuor', '2001-01-07')],
  },
];
const point = (year: number, value: number | null): ObservationPoint => ({
  period: annualPeriod(year),
  value,
  estimateType: 'reported',
  vintage: '2026-11-01',
});
const INDICATORS = [
  {
    code: 'inflation',
    name: 'Inflation',
    unit: '%',
    frequency: 'annual' as const,
    points: [1980, 1985, 2000, 2002, 2003].map((y) => point(y, y - 1970)),
  },
  {
    code: 'poverty',
    name: 'Poverty',
    unit: '%',
    frequency: 'annual' as const,
    points: [point(2003, 30)],
  },
];
const EVENTS = [
  {
    date: '1983-04-01',
    title: 'Economic Recovery Programme',
    kind: 'domestic' as const,
    source: { publisher: 'P', title: 'T', url: 'https://example.org/erp' },
  },
  {
    date: '2010-11-03',
    title: 'GDP rebased',
    kind: 'methodology' as const,
    source: { publisher: 'GSS', title: 'T', url: 'https://example.org/gdp' },
  },
];
const build = (by: 'term' | 'person', slugs: string[]) =>
  buildComparison({
    selection: { by, slugs, topic: 'economy' },
    terms: TERMS,
    indicators: INDICATORS,
    events: EVENTS,
    today: '2026-11-15',
  });

describe('buildComparison', () => {
  it('gives every selected government a row for every indicator in the topic', () => {
    const c = build('term', ['1981-pndc', '2001-kufuor-i']);
    expect(c.indicators.map((i) => i.code)).toEqual(['inflation', 'poverty']);
    for (const i of c.indicators)
      expect(i.rows.map((r) => r.tenureKey)).toEqual(['1981-pndc', '2001-kufuor-i']);
  });

  it('a government with no data gets an all-empty row, not a missing one', () => {
    const poverty = build('term', ['1981-pndc', '2001-kufuor-i']).indicators[1];
    const pndc = poverty?.rows[0]?.summary;
    expect(pndc).toMatchObject({ end: null, average: null, change: null });
    expect(pndc?.coverage.withValue).toBe(0);
  });

  it('tones follow selection order a, b, c, d', () => {
    expect(
      build('term', ['2001-kufuor-i', '1981-pndc']).tenures.map((t) => [t.key, t.tone]),
    ).toEqual([
      ['2001-kufuor-i', 'a'],
      ['1981-pndc', 'b'],
    ]);
  });

  it('by person, each separate stretch is its own row labelled with its years', () => {
    const c = build('person', ['jerry-john-rawlings', 'john-agyekum-kufuor']);
    expect(c.indicators[0]?.rows.map((r) => r.stretchLabel)).toEqual([
      'Jerry John Rawlings (1979)',
      'Jerry John Rawlings (1981–2001)',
      'John Agyekum Kufuor (2001–2005)',
    ]);
    expect(c.tenures[0]).toMatchObject({
      key: 'jerry-john-rawlings',
      label: 'Jerry John Rawlings',
      tone: 'a',
    });
  });

  it('lists only events that fall inside a compared government', () => {
    expect(build('term', ['1981-pndc', '2001-kufuor-i']).events.map((e) => e.title)).toEqual([
      'Economic Recovery Programme',
    ]);
  });
});

describe('compareChoices', () => {
  it('shows every period a leader was in office, in full, in date order', () => {
    const { persons } = compareChoices(TERMS);
    expect(persons.map((p) => [p.name, p.years])).toEqual([
      ['Jerry John Rawlings', '1979; 1981–2001'],
      ['Hilla Limann', '1979–1981'],
      ['John Agyekum Kufuor', '2001–2005'],
    ]);
  });
});
