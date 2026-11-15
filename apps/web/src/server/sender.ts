import 'server-only';
import { createHash } from 'node:crypto';

/**
 * The visitor's address for rate limiting. On Vercel, the header Vercel sets (visitors cannot
 * forge it there). x-forwarded-for is used only on Vercel or behind a proxy we run
 * (TRUST_PROXY=1), and then only its right-most entry, which that proxy appended — the left-most
 * entries are whatever the client sent. With neither, every visitor could write the header, so
 * all reports share one rate-limit bucket ("unknown").
 */
export function clientIp(
  headers: Headers,
  env: Readonly<Record<string, string | undefined>> = process.env,
): string {
  if (env.VERCEL === '1') {
    const platform = headers.get('x-vercel-forwarded-for')?.split(',')[0]?.trim();
    if (platform) return platform;
  }
  if (env.VERCEL !== '1' && env.TRUST_PROXY !== '1') return 'unknown';
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
