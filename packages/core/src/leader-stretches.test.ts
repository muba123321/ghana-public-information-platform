import { describe, expect, it } from 'vitest';
import { type LeaderTerm, leaderStretches } from './leader-stretches.ts';

type L = LeaderTerm['leaders'][number];
const hos = (personSlug: string, startDate: string, endDate: string | null = null): L => ({
  role: 'head_of_state',
  personSlug,
  fullName: personSlug,
  startDate,
  endDate,
});
const hog = (personSlug: string, startDate: string, endDate: string | null = null): L => ({
  ...hos(personSlug, startDate, endDate),
  role: 'head_of_government',
});
const term = (slug: string, start: string, end: string | null, leaders: L[]): LeaderTerm => ({
  slug,
  start,
  end,
  leaders,
});
const brief = (terms: LeaderTerm[]) => leaderStretches(terms).map((s) => [s.slug, s.start, s.end]);

describe('leaderStretches', () => {
  it('the person who led the government is the head of government where there is one', () => {
    expect(
      brief([
        term('1957-dominion', '1957-03-06', '1960-07-01', [
          hos('elizabeth-ii', '1957-03-06'),
          hog('kwame-nkrumah', '1957-03-06'),
        ]),
        term('1960-first-republic', '1960-07-01', '1966-02-24', [
          hos('kwame-nkrumah', '1960-07-01'),
        ]),
      ]),
    ).toEqual([['kwame-nkrumah-1957', '1957-03-06', '1966-02-24']]);
  });

  it('a 1969–72 term goes to the Prime Minister', () => {
    expect(
      brief([
        term('1969-second-republic', '1969-10-01', '1972-01-13', [
          hos('akwasi-afrifa', '1969-10-01', '1970-08-07'),
          hos('edward-akufo-addo', '1970-08-31'),
          hog('kofi-abrefa-busia', '1969-10-01'),
        ]),
      ]),
    ).toEqual([['kofi-abrefa-busia-1969', '1969-10-01', '1972-01-13']]);
  });

  it('a mid-term handover splits by leader dates and joins the next term', () => {
    expect(
      brief([
        term('2009-mills-mahama', '2009-01-07', '2013-01-07', [
          hos('john-evans-atta-mills', '2009-01-07', '2012-07-24'),
          hos('john-dramani-mahama', '2012-07-24'),
        ]),
        term('2013-mahama-i', '2013-01-07', '2017-01-07', [
          hos('john-dramani-mahama', '2013-01-07'),
        ]),
      ]),
    ).toEqual([
      ['john-evans-atta-mills-2009', '2009-01-07', '2012-07-24'],
      ['john-dramani-mahama-2012', '2012-07-24', '2017-01-07'],
    ]);
  });

  it('separate periods in office stay separate', () => {
    expect(
      brief([
        term('1979-afrc', '1979-06-04', '1979-09-24', [hos('jerry-john-rawlings', '1979-06-04')]),
        term('1979-third-republic', '1979-09-24', '1981-12-31', [
          hos('hilla-limann', '1979-09-24'),
        ]),
        term('1981-pndc', '1981-12-31', '1993-01-07', [hos('jerry-john-rawlings', '1981-12-31')]),
      ]).map(([slug]) => slug),
    ).toEqual(['jerry-john-rawlings-1979', 'hilla-limann-1979', 'jerry-john-rawlings-1981']);
  });

  it('a leader across two regimes is one stretch, and the sitting leader has no end', () => {
    expect(
      brief([
        term('1972-nrc', '1972-01-13', '1975-10-09', [
          hos('ignatius-kutu-acheampong', '1972-01-13'),
        ]),
        term('1975-smc-i', '1975-10-09', '1978-07-05', [
          hos('ignatius-kutu-acheampong', '1975-10-09'),
        ]),
        term('2025-mahama-ii', '2025-01-07', null, [hos('john-dramani-mahama', '2025-01-07')]),
      ]),
    ).toEqual([
      ['ignatius-kutu-acheampong-1972', '1972-01-13', '1978-07-05'],
      ['john-dramani-mahama-2025', '2025-01-07', null],
    ]);
  });
});
