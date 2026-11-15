import type { ReactNode } from 'react';
import styles from './Callout.module.css';

/** A highlighted note, e.g. why a list is empty. */
export function Callout({ children }: { children: ReactNode }) {
  return <p className={styles.callout}>{children}</p>;
}
