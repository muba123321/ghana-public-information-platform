import Link from 'next/link';

/** Owner-approved wording (spec §11 item 10). Do not paraphrase. */
export const FOOTER_NOTICE =
  'All information on this platform is compiled from publicly available sources published by Ghanaian public institutions, political parties and international organisations. Every figure links to its original source. GPIP is independent and is not affiliated with the Government of Ghana or any political party.';

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <p>{FOOTER_NOTICE}</p>
      <p>
        <Link href="/data-notice">Data notice &amp; disclaimer</Link>
      </p>
    </footer>
  );
}
