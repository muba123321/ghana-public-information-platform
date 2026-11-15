import type { LookupAddress } from 'node:dns';
import { lookup as dnsLookup } from 'node:dns/promises';
import { isIP } from 'node:net';
import ipaddr from 'ipaddr.js';
import { Agent, fetch as undiciFetch } from 'undici';

export type Lookup = (host: string) => Promise<{ address: string; family: number }[]>;
const defaultLookup: Lookup = (host) => dnsLookup(host, { all: true });

/**
 * True unless the address is ordinary public unicast. Parsed with a real IP library (no string
 * matching), IPv4-mapped/compatible IPv6 is unwrapped first, and every special range — loopback,
 * private, link-local (cloud metadata), CGNAT, multicast, NAT64, 6to4, Teredo, documentation,
 * benchmarking, reserved — is refused. Anything unparseable is refused.
 */
export function isPrivateAddress(ip: string): boolean {
  if (!ipaddr.isValid(ip)) return true;
  let addr = ipaddr.parse(ip);
  if (addr.kind() === 'ipv6') {
    const v6 = addr as ipaddr.IPv6;
    if (v6.isIPv4MappedAddress()) addr = v6.toIPv4Address();
    // IPv4-compatible (::a.b.c.d, deprecated) — first 96 bits zero.
    else if (v6.parts.slice(0, 6).every((p) => p === 0)) return true;
  }
  return addr.range() !== 'unicast';
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

type LookupCallback = (
  err: Error | null,
  address?: string | LookupAddress[],
  family?: number,
) => void;

/**
 * A `lookup` for the socket itself: the address is checked at connect time, on the exact address
 * the connection will use — so a DNS answer that changes between the check and the connection
 * (rebinding) cannot reach an internal address.
 */
export function pinnedLookup(resolve: Lookup = defaultLookup) {
  return (hostname: string, options: { all?: boolean }, callback: LookupCallback) => {
    resolve(hostname)
      .then((addresses) => {
        if (addresses.length === 0 || addresses.some((a) => isPrivateAddress(a.address))) {
          callback(new Error(`${hostname} is not a public address`));
          return;
        }
        if (options?.all) callback(null, addresses as LookupAddress[]);
        else callback(null, addresses[0]?.address, addresses[0]?.family);
      })
      .catch((e: Error) => callback(e));
  };
}

const pinnedAgent = new Agent({ connect: { lookup: pinnedLookup() as never } });
/** fetch whose connections are pinned to checked public addresses. */
const pinnedFetch: typeof fetch = ((input: string, init?: RequestInit) =>
  undiciFetch(input, {
    ...(init as object),
    dispatcher: pinnedAgent,
  } as never)) as unknown as typeof fetch;

/**
 * GET a document from a publisher without letting the server reach internal addresses:
 * every hop (including redirects) is checked before it is requested, and the connection itself
 * is pinned to a checked address.
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
  const {
    fetchImpl = pinnedFetch,
    lookup = defaultLookup,
    timeoutMs = 60_000,
    maxRedirects = 3,
  } = opts;
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
