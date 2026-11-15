import { describe, expect, it } from 'vitest';
import { contributions, totalsByCurrency, validateStewardshipChain } from './commitment.ts';
import type { Tenure } from './tenure.ts';

const timeline: Tenure[] = [
  { slug: '2009-mills-mahama', start: '2009-01-07', end: '2013-01-07' },
  { slug: '2013-mahama-i', start: '2013-01-07', end: '2017-01-07' },
  { slug: '2017-akufo-addo-i', start: '2017-01-07', end: '2021-01-07' },
  { slug: '2021-akufo-addo-ii', start: '2021-01-07', end: '2025-01-07' },
];
const link = (
  administrationSlug: string,
  progressAtStart: number | null,
  progressAtEnd: number | null,
) => ({
  administrationSlug,
  progressAtStart,
  progressAtEnd,
});

describe('validateStewardshipChain', () => {
  it('accepts a contiguous chain starting at the originating administration', () => {
    const chain = [link('2013-mahama-i', 0, 40), link('2017-akufo-addo-i', 40, 100)];
    expect(validateStewardshipChain(chain, '2013-mahama-i', timeline)).toEqual([]);
  });

  it('requires the chain to start with the originating administration', () => {
    expect(
      validateStewardshipChain([link('2017-akufo-addo-i', 0, 10)], '2013-mahama-i', timeline),
    ).toEqual([
      expect.stringMatching(/start with the originating administration \(2013-mahama-i\)/),
    ]);
  });

  it('names a missing administration between two links', () => {
    const chain = [link('2013-mahama-i', 0, 40), link('2021-akufo-addo-ii', 40, 100)];
    expect(validateStewardshipChain(chain, '2013-mahama-i', timeline)).toEqual([
      expect.stringMatching(
        /2017-akufo-addo-i is missing between 2013-mahama-i and 2021-akufo-addo-ii/,
      ),
    ]);
  });

  it('flags progress that jumps between governments', () => {
    const chain = [link('2013-mahama-i', 0, 40), link('2017-akufo-addo-i', 55, 100)];
    expect(validateStewardshipChain(chain, '2013-mahama-i', timeline)).toEqual([
      expect.stringMatching(/2017-akufo-addo-i starts at 55% but 2013-mahama-i ended at 40%/),
    ]);
  });

  it('allows unknown progress without inventing continuity problems', () => {
    const chain = [link('2013-mahama-i', 0, null), link('2017-akufo-addo-i', null, 100)];
    expect(validateStewardshipChain(chain, '2013-mahama-i', timeline)).toEqual([]);
  });

  it('rejects progress outside 0–100, unknown administrations and empty chains', () => {
    expect(
      validateStewardshipChain([link('2013-mahama-i', -5, 120)], '2013-mahama-i', timeline),
    ).toHaveLength(2);
    expect(validateStewardshipChain([link('nope', 0, 1)], 'nope', timeline)).toEqual([
      expect.stringMatching(/unknown administration nope/),
    ]);
    expect(validateStewardshipChain([], '2013-mahama-i', timeline)).toEqual([
      'A commitment needs at least one administration.',
    ]);
  });
});

describe('contributions', () => {
  it('credits each administration with its own share of progress', () => {
    const chain = [link('2013-mahama-i', 0, 40), link('2017-akufo-addo-i', 40, 100)];
    expect(contributions(chain)).toEqual([
      { administrationSlug: '2013-mahama-i', delta: 40 },
      { administrationSlug: '2017-akufo-addo-i', delta: 60 },
    ]);
  });

  it('is null, never zero, when progress is unknown', () => {
    expect(contributions([link('2013-mahama-i', 0, null)])).toEqual([
      { administrationSlug: '2013-mahama-i', delta: null },
    ]);
  });
});

describe('totalsByCurrency', () => {
  it('never adds old cedis to new cedis', () => {
    expect(
      totalsByCurrency([
        { amount: 10_000_000, currency: 'GHC' },
        { amount: 1_000, currency: 'GHS' },
        { amount: 500, currency: 'GHS' },
        { amount: 2, currency: 'USD' },
      ]),
    ).toEqual({ GHC: 10_000_000, GHS: 1_500, USD: 2 });
  });
});
