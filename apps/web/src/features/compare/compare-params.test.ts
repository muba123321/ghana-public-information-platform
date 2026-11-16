import { describe, expect, it } from 'vitest';
import { parseCompareParams } from './compare-params';

const known = {
  terms: [
    '2001-kufuor-i',
    '2005-kufuor-ii',
    '2009-mills-mahama',
    '2013-mahama-i',
    '2017-akufo-addo-i',
  ],
  persons: ['jerry-john-rawlings', 'john-agyekum-kufuor'],
  topics: ['economy', 'health'],
};

describe('parseCompareParams', () => {
  it('keeps two to four known selections in the order given', () => {
    expect(
      parseCompareParams({ a: '2005-kufuor-ii', b: '2001-kufuor-i', topic: 'health' }, known),
    ).toEqual({
      by: 'term',
      slugs: ['2005-kufuor-ii', '2001-kufuor-i'],
      topic: 'health',
      ready: true,
    });
  });

  it('drops unknown and duplicate slugs', () => {
    const p = parseCompareParams(
      { a: '2001-kufuor-i', b: '2001-kufuor-i', c: 'nope', d: '2013-mahama-i' },
      known,
    );
    expect(p.slugs).toEqual(['2001-kufuor-i', '2013-mahama-i']);
  });

  it('reads at most four selections', () => {
    const p = parseCompareParams(
      {
        a: known.terms[0],
        b: known.terms[1],
        c: known.terms[2],
        d: known.terms[3],
        e: known.terms[4],
      } as never,
      known,
    );
    expect(p.slugs).toHaveLength(4);
  });

  it('is not ready with fewer than two', () => {
    expect(parseCompareParams({ a: '2001-kufuor-i' }, known).ready).toBe(false);
    expect(parseCompareParams({}, known)).toMatchObject({ slugs: [], ready: false });
  });

  it('falls back to the first topic', () => {
    expect(parseCompareParams({ topic: 'space' }, known).topic).toBe('economy');
  });

  it('by=person validates against people, not terms', () => {
    const p = parseCompareParams(
      { by: 'person', a: 'jerry-john-rawlings', b: '2001-kufuor-i', c: 'john-agyekum-kufuor' },
      known,
    );
    expect(p).toMatchObject({
      by: 'person',
      slugs: ['jerry-john-rawlings', 'john-agyekum-kufuor'],
    });
  });
});
