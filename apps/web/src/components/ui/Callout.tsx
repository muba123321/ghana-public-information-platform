import type { ReactNode } from 'react';

/** A highlighted note, e.g. why a list is empty. */
export function Callout({ children }: { children: ReactNode }) {
  return <p className="callout">{children}</p>;
}
