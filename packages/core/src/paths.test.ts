import { describe, expect, it } from 'vitest';
import { safeLocalPath } from './paths.ts';

describe('safeLocalPath', () => {
  it.each([
    ['/history/commitments/x', '/history/commitments/x'],
    ['/history/commitments?kind=funded_project', '/history/commitments?kind=funded_project'],
    ['/', '/'],
  ])('keeps the same-site path %s', (input, out) => expect(safeLocalPath(input)).toBe(out));

  it.each([
    '//evil.example',
    '/\\evil.example',
    '\\\\evil.example',
    'https://evil.example/',
    'javascript:alert(1)',
    '/a\nb',
    ' /x',
    '',
    'history',
  ])('refuses %j', (input) => expect(safeLocalPath(input)).toBeNull());
});
