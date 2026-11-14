import Link from 'next/link';
import { SankofaMark } from './SankofaMark';

/** Owner-approved wording (spec §11 item 10). Do not paraphrase. */
export const FOOTER_NOTICE =
  'All information on this platform is compiled from publicly available sources published by Ghanaian public institutions, political parties and international organisations. Every figure links to its original source. GPIP is independent and is not affiliated with the Government of Ghana or any political party.';

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="container site-footer-inner">
        <SankofaMark size={40} />
        <div>
          <p className="footer-notice">{FOOTER_NOTICE}</p>
          <p className="footer-links">
            <Link href="/data-notice">Data notice &amp; disclaimer</Link>
            <Link href="/report">Report an error</Link>
            <Link href="/changes">Change log</Link>
            <a href="https://github.com/muba123321/ghana-public-information-platform">
              Open source on GitHub
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
