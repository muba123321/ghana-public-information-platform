const PDF_SIGNATURE = '%PDF-';

/**
 * Headers for serving an archived original to an editor. Only verified PDFs are shown inline;
 * everything else (HTML, SVG, mislabelled files) downloads as inert bytes in a sandbox, so an
 * archived page can never run script on our origin.
 */
export function archivedFileHeaders(mime: string, bytes: Uint8Array): Record<string, string> {
  const base = { 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' };
  const realPdf =
    mime === 'application/pdf' &&
    Buffer.from(bytes.subarray(0, 5)).toString('latin1') === PDF_SIGNATURE;
  return realPdf
    ? { ...base, 'Content-Type': 'application/pdf', 'Content-Disposition': 'inline' }
    : {
        ...base,
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': 'attachment',
        'Content-Security-Policy': "default-src 'none'; sandbox",
      };
}
