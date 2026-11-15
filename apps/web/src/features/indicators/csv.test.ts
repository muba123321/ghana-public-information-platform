import { describe, expect, it } from 'vitest';
import { toCsv } from './csv';

describe('toCsv', () => {
  it('writes a header and rows, with empty cells for null', () => {
    expect(
      toCsv(
        ['a', 'b'],
        [
          [1, null],
          ['x', 2.5],
        ],
      ),
    ).toBe('a,b\r\n1,\r\nx,2.5\r\n');
  });

  it('quotes commas, quotes and newlines', () => {
    expect(toCsv(['t'], [['a,b'], ['say "hi"'], ['line\nbreak']])).toBe(
      't\r\n"a,b"\r\n"say ""hi"""\r\n"line\nbreak"\r\n',
    );
  });

  it.each(['=1+1', '+SUM(A1)', '-2+3', '@cmd', '\tx', '\rx'])(
    'neutralises formula-like text %j',
    (cell) => {
      expect(toCsv(['t'], [[cell]]).split('\r\n')[1]).toMatch(/^"?'/);
    },
  );

  it('leaves negative numbers as numbers', () => {
    expect(toCsv(['v'], [[-3.2]])).toBe('v\r\n-3.2\r\n');
  });
});
