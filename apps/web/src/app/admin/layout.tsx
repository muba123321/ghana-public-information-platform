import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { EditorFrame } from '@/components/layout/EditorFrame';
import { signOutAction } from '@/server/auth-actions';
import { requireEditor } from '@/server/editor-access';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Editor', robots: { index: false, follow: false } };

export default async function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <EditorFrame login={await requireEditor()} signOut={signOutAction}>
      {children}
    </EditorFrame>
  );
}
