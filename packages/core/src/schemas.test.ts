import { describe, expect, it } from 'vitest';
import {
  AdministrationSeedSchema,
  ContextEventSeedSchema,
  ExtractionResultSchema,
  IndicatorSeedSchema,
  LeaderSeedSchema,
} from './schemas.ts';

const valid = {
  slug: '1993-rawlings-i',
  name: 'Rawlings I (Fourth Republic)',
  kind: 'civilian',
  partySlug: 'ndc',
  startDate: '1993-01-07',
  endDate: '1997-01-07',
  sourceKey: 'wiki-heads-of-state',
};

describe('seed schemas', () => {
  it('accepts a valid administration', () => {
    expect(AdministrationSeedSchema.parse(valid)).toMatchObject({ slug: '1993-rawlings-i' });
  });

  it('rejects an impossible date', () => {
    expect(() => AdministrationSeedSchema.parse({ ...valid, startDate: '2023-02-30' })).toThrow();
  });

  it('rejects an unknown kind', () => {
    expect(() => AdministrationSeedSchema.parse({ ...valid, kind: 'democratic' })).toThrow();
  });

  it('rejects an end date on or before the start date', () => {
    expect(() => AdministrationSeedSchema.parse({ ...valid, endDate: '1993-01-07' })).toThrow();
  });

  it('rejects a leader with an unknown role', () => {
    expect(() =>
      LeaderSeedSchema.parse({
        administrationSlug: 'x',
        personSlug: 'y',
        role: 'king',
        startDate: '1993-01-07',
        endDate: null,
        sourceKey: 's',
      }),
    ).toThrow();
  });
});

describe('indicator and context-event seeds', () => {
  const indicator = {
    code: 'inflation',
    name: 'Inflation, consumer prices',
    definition: 'How fast the prices people pay rose over the year.',
    unit: '% per year',
    frequency: 'annual',
    sectorSlug: 'economy',
    sourceKey: 'world-bank-wdi',
    seriesCode: 'FP.CPI.TOTL.ZG',
    estimateType: 'reported',
  };

  it('accepts a catalogue entry', () => {
    expect(IndicatorSeedSchema.parse(indicator).code).toBe('inflation');
  });

  it('rejects an unknown estimate type', () => {
    expect(() => IndicatorSeedSchema.parse({ ...indicator, estimateType: 'guess' })).toThrow();
  });

  const event = {
    date: '2020-03-11',
    title: 'COVID-19 declared a pandemic by the WHO',
    kind: 'international',
    sourceKey: 'who-covid',
  };

  it('accepts a neutral context event', () => {
    expect(ContextEventSeedSchema.parse(event).title).toBe(event.title);
  });

  it.each([
    'Economic boom begins',
    'Failure of the cedi',
    'Government achieves growth',
    'Disaster year',
  ])('rejects evaluative wording: %s', (title) => {
    expect(() => ContextEventSeedSchema.parse({ ...event, title })).toThrow();
  });

  it('rejects titles over 90 characters', () => {
    expect(() => ContextEventSeedSchema.parse({ ...event, title: 'x'.repeat(91) })).toThrow();
  });
});

describe('extraction schema', () => {
  const item = {
    wording: 'We will build 88 district hospitals.',
    page: 42,
    kind: 'campaign_promise',
  };

  it('accepts a minimal extracted commitment', () => {
    expect(ExtractionResultSchema.parse({ commitments: [item] }).commitments).toHaveLength(1);
  });

  it.each([
    [{ ...item, page: 0 }],
    [{ ...item, wording: '   ' }],
    [{ ...item, kind: 'promise' }],
    [{ ...item, budget: { amount: 5, currency: 'EUR', note: null } }],
  ])('rejects %j', (bad) => {
    expect(() => ExtractionResultSchema.parse({ commitments: [bad] })).toThrow();
  });
});
