import { describe, expect, it } from 'vitest';
import { clientIp, senderHash } from './sender';

describe('senderHash', () => {
  it('is a salted one-way hash, stable per sender and secret', () => {
    const a = senderHash('41.66.1.2', 'secret-1');
    expect(a).toMatch(/^[0-9a-f]{64}$/);
    expect(a).not.toContain('41.66');
    expect(senderHash('41.66.1.2', 'secret-1')).toBe(a);
    expect(senderHash('41.66.1.3', 'secret-1')).not.toBe(a);
    expect(senderHash('41.66.1.2', 'secret-2')).not.toBe(a);
  });
});

describe('clientIp', () => {
  it('prefers the address the hosting platform sets, which visitors cannot spoof', () => {
    expect(
      clientIp(
        new Headers({
          'x-vercel-forwarded-for': '41.66.1.2',
          'x-forwarded-for': '6.6.6.6, 41.66.1.2',
        }),
      ),
    ).toBe('41.66.1.2');
    expect(clientIp(new Headers({ 'x-real-ip': '41.66.9.9', 'x-forwarded-for': '6.6.6.6' }))).toBe(
      '41.66.9.9',
    );
  });

  it('otherwise takes the right-most x-forwarded-for entry (added by our proxy), not a spoofed first one', () => {
    expect(clientIp(new Headers({ 'x-forwarded-for': 'spoofed-1, spoofed-2, 41.66.1.2' }))).toBe(
      '41.66.1.2',
    );
  });

  it('falls back to unknown', () => {
    expect(clientIp(new Headers())).toBe('unknown');
  });
});
