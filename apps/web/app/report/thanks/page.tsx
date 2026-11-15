import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = { title: 'Report received', robots: { index: false } };

export default function ThanksPage() {
  return (
    <div className="container page prose">
      <h1 className="page-title">Thank you — an editor will review this.</h1>
      <p>
        If the correction is accepted it will appear in the{' '}
        <Link href="/changes">public change log</Link>.
      </p>
    </div>
  );
}
