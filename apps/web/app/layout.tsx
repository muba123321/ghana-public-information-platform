import type { Metadata, Viewport } from 'next';
import { Atkinson_Hyperlegible_Next, Bricolage_Grotesque } from 'next/font/google';
import type { ReactNode } from 'react';
import { SiteFooter } from '../components/SiteFooter';
import { SiteHeader } from '../components/SiteHeader';
import './globals.css';

const display = Bricolage_Grotesque({
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
});
const body = Atkinson_Hyperlegible_Next({
  subsets: ['latin'],
  variable: '--font-body',
  display: 'swap',
});

export const metadata: Metadata = {
  title: { default: 'Ghana Public Information Platform', template: '%s · GPIP' },
  description:
    'A neutral, sourced record of every government of Ghana since 1957 — who governed, when, and the public evidence behind each record.',
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#2a1b14' },
    { media: '(prefers-color-scheme: dark)', color: '#1a110c' },
  ],
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en-GH" className={`${display.variable} ${body.variable}`}>
      <body>
        <a className="skip-link" href="#main">
          Skip to content
        </a>
        <SiteHeader />
        <main id="main">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
