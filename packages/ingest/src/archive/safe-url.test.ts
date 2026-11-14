import { describe, expect, it } from 'vitest';
import { assertPublicUrl, isPrivateAddress, pinnedLookup, safeDownload } from './safe-url.ts';

const lookupTo = (address: string) => async () => [
  { address, family: address.includes(':') ? 6 : 4 },
];

describe('isPrivateAddress', () => {
  it.each([
    '127.0.0.1',
    '10.1.2.3',
    '172.16.0.1',
    '172.31.255.255',
    '192.168.1.1',
    '169.254.169.254',
    '0.0.0.0',
    '100.64.0.1',
    '::1',
    'fd00::1',
    'fe80::1',
    '::ffff:127.0.0.1',
    '::ffff:10.0.0.1',
  ])('blocks %s', (ip) => expect(isPrivateAddress(ip)).toBe(true));

  it.each(['8.8.8.8', '172.32.0.1', '41.66.200.1', '2606:4700::1111'])('allows %s', (ip) =>
    expect(isPrivateAddress(ip)).toBe(false),
  );
});

describe('assertPublicUrl', () => {
  it('refuses non-https URLs', async () => {
    await expect(
      assertPublicUrl('http://example.org/m.pdf', lookupTo('93.184.216.34')),
    ).rejects.toThrow(/https/);
  });

  it('refuses hosts that resolve to internal addresses', async () => {
    await expect(
      assertPublicUrl('https://metadata.internal/x', lookupTo('169.254.169.254')),
    ).rejects.toThrow(/not a public address/);
    await expect(assertPublicUrl('https://127.0.0.1/x', lookupTo('127.0.0.1'))).rejects.toThrow(
      /not a public address/,
    );
  });

  it('accepts public hosts', async () => {
    await expect(
      assertPublicUrl('https://example.org/m.pdf', lookupTo('93.184.216.34')),
    ).resolves.toBeUndefined();
  });
});

describe('safeDownload', () => {
  it('re-checks every redirect hop', async () => {
    const fetchImpl = (async (u: string) =>
      String(u).includes('start')
        ? new Response(null, {
            status: 302,
            headers: { location: 'https://inside.example/secret' },
          })
        : new Response('secret')) as typeof fetch;
    const lookup = async (host: string) => [
      { address: host === 'inside.example' ? '10.0.0.5' : '93.184.216.34', family: 4 },
    ];
    await expect(
      safeDownload('https://public.example/start', { fetchImpl, lookup }),
    ).rejects.toThrow(/not a public address/);
  });

  it('stops after too many redirects', async () => {
    const fetchImpl = (async () =>
      new Response(null, {
        status: 302,
        headers: { location: 'https://public.example/again' },
      })) as typeof fetch;
    await expect(
      safeDownload('https://public.example/a', { fetchImpl, lookup: lookupTo('93.184.216.34') }),
    ).rejects.toThrow(/redirects/);
  });

  it('returns the final response for a public URL', async () => {
    const fetchImpl = (async () =>
      new Response('%PDF-1.4', {
        status: 200,
        headers: { 'content-type': 'application/pdf' },
      })) as typeof fetch;
    const res = await safeDownload('https://public.example/m.pdf', {
      fetchImpl,
      lookup: lookupTo('93.184.216.34'),
    });
    expect(await res.text()).toBe('%PDF-1.4');
  });
});

describe('address forms that must not slip through', () => {
  it.each([
    '::ffff:7f00:1', // IPv4-mapped loopback, as the URL parser normalises it
    '::ffff:a9fe:a9fe', // mapped cloud metadata
    '::7f00:1', // IPv4-compatible
    '64:ff9b::a00:1', // NAT64 to 10.0.0.1
    '2002:a00:1::', // 6to4 embedding 10.0.0.1
    'ff02::1', // multicast
    '224.0.0.1',
    '255.255.255.255',
    '198.18.0.1', // benchmarking
    '2001:db8::1', // documentation
  ])('blocks %s', (ip) => expect(isPrivateAddress(ip)).toBe(true));

  it('refuses a bracketed mapped address in a URL', async () => {
    await expect(assertPublicUrl('https://[::ffff:127.0.0.1]/x')).rejects.toThrow(
      /not a public address/,
    );
  });
});

describe('pinned connection lookup (DNS rebinding)', () => {
  it('refuses to connect when the address resolved at connect time is private', async () => {
    const lookup = pinnedLookup(async () => [{ address: '10.0.0.5', family: 4 }]);
    await expect(
      new Promise((res, rej) =>
        lookup('rebind.example', {}, (err, addr) => (err ? rej(err) : res(addr))),
      ),
    ).rejects.toThrow(/not a public address/);
  });

  it('connects to the checked public address', async () => {
    const lookup = pinnedLookup(async () => [{ address: '93.184.216.34', family: 4 }]);
    const addrs = await new Promise((res, rej) =>
      lookup('ok.example', { all: true }, (err, addr) => (err ? rej(err) : res(addr))),
    );
    expect(addrs).toEqual([{ address: '93.184.216.34', family: 4 }]);
  });
});
