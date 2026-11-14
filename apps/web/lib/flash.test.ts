import { describe, expect, it } from 'vitest';
import { decodeFlash, encodeFlash } from './flash';

describe('flash messages', () => {
  it('round-trips a server-set message', () => {
    expect(
      decodeFlash(encodeFlash({ kind: 'error', text: 'Page must be between 1 and 2.' })),
    ).toEqual({ kind: 'error', text: 'Page must be between 1 and 2.' });
  });

  it.each([
    '',
    'not json',
    '{"kind":"html","text":"x"}',
    '{"kind":"error"}',
    JSON.stringify({ kind: 'note', text: 'x'.repeat(501) }),
  ])('ignores anything malformed: %j', (raw) => expect(decodeFlash(raw)).toBeNull());
});
