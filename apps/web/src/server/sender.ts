import 'server-only';
import { createHash } from 'node:crypto';

/**
 * The visitor's address for rate limiting. On Vercel, the header Vercel sets (visitors cannot
 * forge it there); anywhere else that header is just client input and is ignored. Otherwise the
 * right-most x-forwarded-for entry, which our own proxy appended — the left-most entries are
 * whatever the client sent.
 */
export function clientIp(
  headers: Headers,
  env: Readonly<Record<string, string | undefined>> = process.env,
): string {
  if (env.VERCEL === '1') {
    const platform = headers.get('x-vercel-forwarded-for')?.split(',')[0]?.trim();
    if (platform) return platform;
  }
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
