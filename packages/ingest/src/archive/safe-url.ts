import { lookup as dnsLookup } from 'node:dns/promises';
import { isIP } from 'node:net';

export type Lookup = (host: string) => Promise<{ address: string; family: number }[]>;
const defaultLookup: Lookup = (host) => dnsLookup(host, { all: true });

const v4 = (ip: string) => ip.split('.').map(Number) as [number, number, number, number];

/** Loopback, private, link-local (incl. cloud metadata), CGNAT, unspecified and IPv6 equivalents. */
export function isPrivateAddress(ip: string): boolean {
  const lower = ip.toLowerCase();
  const mapped = lower.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (mapped?.[1]) return isPrivateAddress(mapped[1]);
  if (isIP(lower) === 4) {
    const [a, b] = v4(lower);
    return (
      a === 0 ||
      a === 10 ||
      a === 127 ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 100 && b >= 64 && b <= 127)
    );
  }
  if (isIP(lower) === 6)
    return lower === '::1' || lower === '::' || /^f[cd]/.test(lower) || /^fe[89ab]/.test(lower);
  return true; // not an IP at all: treat as unsafe
}

/** Only https URLs whose host resolves exclusively to public addresses. */
export async function assertPublicUrl(raw: string, lookup: Lookup = defaultLookup): Promise<void> {
  const url = new URL(raw);
  if (url.protocol !== 'https:') throw new Error('Only https:// URLs can be archived');
  const host = url.hostname.replace(/^\[|\]$/g, '');
  const addresses = isIP(host) ? [{ address: host, family: isIP(host) }] : await lookup(host);
  if (addresses.length === 0 || addresses.some((a) => isPrivateAddress(a.address))) {
    throw new Error(`${url.hostname} is not a public address`);
  }
}

/**
 * GET a document from a publisher without letting the server reach internal addresses:
 * every hop (including redirects) is checked before it is requested.
 */
export async function safeDownload(
  raw: string,
  opts: {
    fetchImpl?: typeof fetch;
    lookup?: Lookup;
    timeoutMs?: number;
    maxRedirects?: number;
  } = {},
): Promise<Response> {
  const { fetchImpl = fetch, lookup = defaultLookup, timeoutMs = 60_000, maxRedirects = 3 } = opts;
  let url = raw;
  for (let hop = 0; hop <= maxRedirects; hop++) {
    await assertPublicUrl(url, lookup);
    const res = await fetchImpl(url, {
      redirect: 'manual',
      signal: AbortSignal.timeout(timeoutMs),
    });
    const location = res.status >= 300 && res.status < 400 ? res.headers.get('location') : null;
    if (!location) return res;
    url = new URL(location, url).toString();
  }
  throw new Error(`Too many redirects fetching ${raw}`);
}
