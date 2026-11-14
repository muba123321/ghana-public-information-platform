import { createHash } from 'node:crypto';

/** The visitor's address as reported by the hosting proxy (first hop of x-forwarded-for). */
export function clientIp(headers: Headers): string {
  return (
    headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    headers.get('x-real-ip')?.trim() ||
    'unknown'
  );
}

/** One-way salted hash used only to rate-limit reports. The raw address is never stored. */
export function senderHash(ip: string, secret: string): string {
  return createHash('sha256').update(`${secret}:${ip}`).digest('hex');
}
