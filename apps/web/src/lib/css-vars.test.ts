import { describe, expect, it } from 'vitest';
import { cssVars } from './css-vars';

describe('cssVars', () => {
  it('passes custom properties through as a style object', () => {
    expect(cssVars({ '--left': '12%', '--width': '3%' })).toEqual({
      '--left': '12%',
      '--width': '3%',
    });
  });
});
