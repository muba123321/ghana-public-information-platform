import { describe, expect, it } from 'vitest';
import { figureRows } from './region-figures';

describe('figureRows', () => {
  it('labels figures measured for a former region, and leaves own figures plain', () => {
    expect(
      figureRows([
        {
          year: 2014,
          value: 40,
          measuredFor: {
            slug: 'northern-former',
            name: 'Northern Region (before 2019)',
            former: true,
          },
        },
        {
          year: 2022,
          value: 61,
          measuredFor: { slug: 'savannah', name: 'Savannah', former: false },
        },
        {
          year: 2003,
          value: null,
          measuredFor: {
            slug: 'northern-former',
            name: 'Northern Region (before 2019)',
            former: true,
          },
        },
      ]),
    ).toEqual([
      {
        year: 2003,
        value: null,
        geography: 'figure for the Northern Region (before 2019)',
        former: true,
      },
      {
        year: 2014,
        value: 40,
        geography: 'figure for the Northern Region (before 2019)',
        former: true,
      },
      { year: 2022, value: 61, geography: 'Savannah', former: false },
    ]);
  });
});
