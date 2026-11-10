import Link from 'next/link';
import { SankofaMark } from './SankofaMark';

export function SiteHeader() {
  return (
    <header className="site-header">
      <div className="container site-header-inner">
        <Link href="/" className="brand">
          <SankofaMark size={30} />
          <span className="brand-text">
            <span className="brand-name">GPIP</span>
            <span className="brand-full">Ghana Public Information Platform</span>
          </span>
        </Link>
        <nav aria-label="Main">
          <ul className="nav">
            <li>
              <Link href="/history/administrations">Governments</Link>
            </li>
            <li>
              <Link href="/history">Explore</Link>
            </li>
            <li>
              <Link href="/data-notice">About the data</Link>
            </li>
          </ul>
        </nav>
      </div>
    </header>
  );
}
