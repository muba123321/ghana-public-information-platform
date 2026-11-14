import { describe, expect, it } from 'vitest';
import { archivedFileHeaders } from './files';

const pdf = new Uint8Array(Buffer.from('%PDF-1.4 ...'));
const html = new Uint8Array(Buffer.from('<html><script>alert(1)</script>'));

describe('archivedFileHeaders', () => {
  it('shows a real PDF inline', () => {
    expect(archivedFileHeaders('application/pdf', pdf)).toMatchObject({
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'inline',
    });
  });

  it('forces anything else to download as inert bytes, sandboxed', () => {
    for (const [mime, bytes] of [
      ['text/html', html],
      ['application/pdf', html],
      ['image/svg+xml', html],
    ] as const) {
      const h = archivedFileHeaders(mime, bytes);
      expect(h['Content-Type']).toBe('application/octet-stream');
      expect(h['Content-Disposition']).toBe('attachment');
      expect(h['Content-Security-Policy']).toContain('sandbox');
    }
  });

  it('is never cached and never sniffed', () => {
    const h = archivedFileHeaders('application/pdf', pdf);
    expect(h['Cache-Control']).toBe('private, no-store');
    expect(h['X-Content-Type-Options']).toBe('nosniff');
  });
});
