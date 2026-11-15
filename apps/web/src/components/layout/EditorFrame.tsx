import Link from 'next/link';
import type { ReactNode } from 'react';
import { Button } from '@/components/ui/Button';

interface Props {
  login: string;
  signOut: (form: FormData) => Promise<void>;
  children: ReactNode;
}

/** The editor area's frame: section links, who is signed in, and sign-out. */
export function EditorFrame({ login, signOut, children }: Props) {
  return (
    <div className="container page admin">
      <nav className="admin-nav" aria-label="Editor">
        <Link href="/admin">Overview</Link>
        <Link href="/admin/review">Review queue</Link>
        <Link href="/admin/documents">Documents</Link>
        <Link href="/admin/corrections">Error reports</Link>
        <form action={signOut} className="admin-user">
          <span>Signed in as {login}</span>
          <Button variant="link">Sign out</Button>
        </form>
      </nav>
      {children}
    </div>
  );
}
