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
  const onVercel = { VERCEL: '1' };
  const behindProxy = { TRUST_PROXY: '1' };

  it('on Vercel, uses the address Vercel sets, which visitors cannot spoof', () => {
    const h = new Headers({
      'x-vercel-forwarded-for': '41.66.1.2',
      'x-forwarded-for': '6.6.6.6, 41.66.1.2',
    });
    expect(clientIp(h, onVercel)).toBe('41.66.1.2');
  });

  it('off Vercel, ignores x-vercel-forwarded-for (any visitor could send it)', () => {
    const h = new Headers({
      'x-vercel-forwarded-for': '6.6.6.6',
      'x-forwarded-for': 'spoofed, 41.66.1.2',
    });
    expect(clientIp(h, behindProxy)).toBe('41.66.1.2');
  });

  it('never trusts x-real-ip, which nothing in our stack sets', () => {
    const h = new Headers({ 'x-real-ip': '6.6.6.6', 'x-forwarded-for': '41.66.9.9' });
    expect(clientIp(h, behindProxy)).toBe('41.66.9.9');
    expect(clientIp(h, onVercel)).toBe('41.66.9.9');
  });

  it('behind a trusted proxy, takes the right-most x-forwarded-for entry (added by the proxy), not a spoofed first one', () => {
    expect(
      clientIp(new Headers({ 'x-forwarded-for': 'spoofed-1, spoofed-2, 41.66.1.2' }), behindProxy),
    ).toBe('41.66.1.2');
  });

  it('with no trusted proxy, ignores x-forwarded-for entirely (a direct visitor writes it)', () => {
    const h = new Headers({ 'x-forwarded-for': '6.6.6.6' });
    expect(clientIp(h, {})).toBe('unknown');
    expect(clientIp(h, { TRUST_PROXY: 'yes' })).toBe('unknown');
  });

  it('falls back to unknown', () => {
    expect(clientIp(new Headers(), {})).toBe('unknown');
  });
});
