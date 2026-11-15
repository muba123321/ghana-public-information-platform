import type { Metadata } from 'next';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { requireEditor } from '../../lib/admin';
import { signOutAction } from './actions';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Editor', robots: { index: false, follow: false } };

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const login = await requireEditor();
  return (
    <div className="container page admin">
      <nav className="admin-nav" aria-label="Editor">
        <Link href="/admin">Overview</Link>
        <Link href="/admin/review">Review queue</Link>
        <Link href="/admin/documents">Documents</Link>
        <Link href="/admin/corrections">Error reports</Link>
        <form action={signOutAction} className="admin-user">
          <span>Signed in as {login}</span>
          <button type="submit" className="link-button">
            Sign out
          </button>
        </form>
      </nav>
      {children}
    </div>
  );
}
