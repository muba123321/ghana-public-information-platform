import Link from 'next/link';
import { SankofaMark } from './SankofaMark';
import styles from './SiteHeader.module.css';

export function SiteHeader() {
  return (
    <header className={styles.siteHeader}>
      <div className={`container ${styles.siteHeaderInner}`}>
        <Link href="/" className={styles.brand}>
          <SankofaMark size={30} />
          <span className={styles.brandText}>
            <span className={styles.brandName}>GPIP</span>
            <span className={styles.brandFull}>Ghana Public Information Platform</span>
          </span>
        </Link>
        <nav aria-label="Main">
          <ul className={styles.nav}>
            <li>
              <Link href="/history/administrations">Governments</Link>
            </li>
            <li>
              <Link href="/history/indicators">Indicators</Link>
            </li>
            <li>
              <Link href="/history/compare">Compare</Link>
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
