import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = { title: 'Government Performance & History' };

const AREAS: { name: string; href?: string }[] = [
  { name: 'Administration directory', href: '/history/administrations' },
  { name: 'Administration profiles' },
  { name: 'Commitment tracker' },
  { name: 'Historical indicators' },
  { name: 'Compare administrations' },
  { name: 'Ministry history' },
  { name: 'Outstanding commitments' },
  { name: 'Development timelines' },
  { name: 'Sources and documents' },
];

export default function HistoryPage() {
  return (
    <>
      <h1>Government Performance &amp; History</h1>
      <p className="lede">
        A continuous record across every government since 1957: commitments, resources, outcomes and
        the evidence behind them. No scores — just sourced facts, with gaps shown as gaps.
      </p>
      <ul className="areas">
        {AREAS.map((a) => (
          <li key={a.name}>
            {a.href ? <Link href={a.href}>{a.name}</Link> : a.name}
            {!a.href && <span className="soon">Coming soon</span>}
          </li>
        ))}
      </ul>
    </>
  );
}
