import { describe, expect, it } from 'vitest';
import { AdministrationSeedSchema, LeaderSeedSchema } from './schemas.ts';

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
