import type { Metadata } from 'next';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { SiteFooter } from '../components/SiteFooter';
import './globals.css';

export const metadata: Metadata = {
  title: { default: 'Ghana Public Information Platform', template: '%s · GPIP' },
  description:
    "A neutral, sourced record of what Ghana's governments promised, funded and delivered, from 1957 to today.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en-GH">
      <body>
        <header className="site-header">
          <div className="container">
            <Link href="/">Ghana Public Information Platform</Link>
          </div>
        </header>
        <main className="container">{children}</main>
        <div className="container">
          <SiteFooter />
        </div>
      </body>
    </html>
  );
}
