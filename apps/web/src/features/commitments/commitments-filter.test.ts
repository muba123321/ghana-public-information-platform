import { describe, expect, it } from 'vitest';
import { parseCommitmentFilters } from './commitments-filter';

const known = { administrations: ['2017-akufo-addo-i'], sectors: ['education', 'water'] };

describe('parseCommitmentFilters', () => {
  it('keeps every filter that names something real', () => {
    expect(
      parseCommitmentFilters(
        {
          administration: '2017-akufo-addo-i',
          sector: 'water',
          kind: 'funded_project',
          status: 'completed',
          q: '  school  ',
        },
        known,
      ),
    ).toEqual({
      administration: '2017-akufo-addo-i',
      sector: 'water',
      kind: 'funded_project',
      status: 'completed',
      q: 'school',
    });
  });

  it('drops unknown values instead of passing them to the database', () => {
    expect(
      parseCommitmentFilters(
        { administration: 'nope', sector: 'space', kind: 'promise', status: 'done', q: '   ' },
        known,
      ),
    ).toEqual({});
  });

  it('caps the search text at 100 characters', () => {
    expect(parseCommitmentFilters({ q: 'x'.repeat(300) }, known).q).toHaveLength(100);
  });
});
