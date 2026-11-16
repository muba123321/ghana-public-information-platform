import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { mapDhsRegion, parseDhsRegional } from './dhs.ts';

const fixture = JSON.parse(
  readFileSync(new URL('../../fixtures/dhs/regional.json', import.meta.url), 'utf8'),
);

describe('DHS regional figures', () => {
  it('maps every region name in the recorded surveys, skipping only multi-region totals', () => {
    const { errors } = parseDhsRegional(fixture);
    expect(errors).toEqual([]);
  });

  it('keeps a pre-split survey with the former region, and a post-split survey with the new one', () => {
    expect(mapDhsRegion('Brong-Ahafo')).toBe('brong-ahafo');
    expect(mapDhsRegion('..Northern (pre 2022)')).toBe('northern-former');
    expect(mapDhsRegion('....Savannah')).toBe('savannah');
    expect(mapDhsRegion('....Northern(post 2022)')).toBe('northern');
    expect(mapDhsRegion('Northern, Upper West, Upper East')).toBe('skip');
    const { rows } = parseDhsRegional(fixture);
    const savannah2022 = rows.find((r) => r.regionSlug === 'savannah' && r.year === 2022);
    expect(savannah2022?.code).toBeDefined();
    expect(rows.some((r) => r.regionSlug === 'savannah' && r.year < 2019)).toBe(false);
  });

  it('an unknown region name is an error, never a guess', () => {
    expect(mapDhsRegion('Atlantis')).toBeNull();
    const { rows, errors } = parseDhsRegional({
      Data: [
        {
          IndicatorId: 'HC_ELEC_H_ELC',
          SurveyYear: 2022,
          SurveyId: 'X',
          CharacteristicLabel: 'Atlantis',
          Value: 1,
          IsPreferred: 1,
        },
      ],
    });
    expect(rows).toEqual([]);
    expect(errors[0]).toMatch(/Atlantis/);
  });

  it('uses the preferred figure when a survey reports several', () => {
    const { rows } = parseDhsRegional(fixture);
    const western1988 = rows.filter(
      (r) =>
        r.code === 'skilled-birth-attendance' &&
        r.regionSlug === 'western-former' &&
        r.year === 1988,
    );
    expect(western1988).toEqual([expect.objectContaining({ value: 40 })]);
  });
});
