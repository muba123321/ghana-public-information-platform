import { createHash } from 'node:crypto';

/**
 * The visitor's address for rate limiting. Prefers headers set by the hosting platform (visitors
 * cannot forge them); otherwise the right-most x-forwarded-for entry, which our own proxy appended
 * — the left-most entries are whatever the client sent.
 */
export function clientIp(headers: Headers): string {
  const platform = headers.get('x-vercel-forwarded-for') ?? headers.get('x-real-ip');
  if (platform?.trim()) return platform.split(',')[0]?.trim() ?? 'unknown';
  const chain = (headers.get('x-forwarded-for') ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  return chain.at(-1) ?? 'unknown';
}

/** One-way salted hash used only to rate-limit reports. The raw address is never stored. */
export function senderHash(ip: string, secret: string): string {
  return createHash('sha256').update(`${secret}:${ip}`).digest('hex');
}
