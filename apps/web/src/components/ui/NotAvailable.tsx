import styles from './NotAvailable.module.css';

/** The single way the site shows missing data — never a blank, never a zero. */
export function NotAvailable({ what }: { what?: string }) {
  return (
    <span className={styles.notAvailable}>
      {what && <span className={styles.srOnly}>{what}: </span>}
      Not available
    </span>
  );
}
