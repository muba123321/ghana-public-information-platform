import Link from 'next/link';
import type { ReactNode } from 'react';
import styles from './PageHeader.module.css';

/** A page's heading: an optional "All …" link back to its list, the title, and a one-line lede. */
export function PageHeader({
  title,
  lede,
  back,
}: {
  title: ReactNode;
  lede?: ReactNode;
  back?: { href: string; label: string };
}) {
  return (
    <>
      {back && (
        <p className="crumbs">
          <Link href={back.href}>{back.label}</Link>
        </p>
      )}
      <h1 className="page-title">{title}</h1>
      {lede && <p className={styles.pageLede}>{lede}</p>}
    </>
  );
}
