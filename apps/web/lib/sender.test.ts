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
  it('takes the first address from x-forwarded-for, else x-real-ip, else unknown', () => {
    expect(clientIp(new Headers({ 'x-forwarded-for': '41.66.1.2, 10.0.0.1' }))).toBe('41.66.1.2');
    expect(clientIp(new Headers({ 'x-real-ip': '41.66.9.9' }))).toBe('41.66.9.9');
    expect(clientIp(new Headers())).toBe('unknown');
  });
});
