import type { Metadata } from 'next';
import Link from 'next/link';
import { PageContainer } from '@/components/layout/PageContainer';
import { PageHeader } from '@/components/layout/PageHeader';
import { Pill } from '@/components/ui/Pill';

export const metadata: Metadata = { title: 'Government Performance & History' };

const AREAS: { name: string; about: string; href?: string }[] = [
  {
    name: 'Administration directory',
    about: 'Every government since 1957 with its leaders and dates.',
    href: '/history/administrations',
  },
  {
    name: 'Administration profiles',
    about: 'One page per government: commitments, resources and outcomes.',
  },
  {
    name: 'Commitment tracker',
    about: 'Promises from manifestos, budgets and policy statements.',
    href: '/history/commitments',
  },
  {
    name: 'Historical indicators',
    about: 'National statistics over decades, with each term marked.',
    href: '/history/indicators',
  },
  {
    name: 'Compare administrations',
    about: 'Side-by-side figures, with the starting point each inherited.',
  },
  {
    name: 'Ministry history',
    about: 'How ministries were created, renamed and merged.',
    href: '/history/ministries',
  },
  {
    name: 'Outstanding commitments',
    about: 'Projects still unfinished, and who holds them now.',
    href: '/history/outstanding',
  },
  { name: 'Development timelines', about: 'Key events and indicators on one timeline.' },
  {
    name: 'Sources and documents',
    about: 'The original documents and datasets behind everything here.',
    href: '/history/sources',
  },
];

export default function HistoryPage() {
  return (
    <PageContainer>
      <PageHeader
        title="Government Performance &amp; History"
        lede="A continuous record across every government since 1957. No scores, just sourced facts, with gaps shown as gaps."
      />
      <ul className="areas">
        {AREAS.map((a) => (
          <li key={a.name} data-soon={a.href ? undefined : true}>
            {a.href ? (
              <Link href={a.href} className="area-name">
                {a.name}
              </Link>
            ) : (
              <span className="area-name">{a.name}</span>
            )}
            <p>{a.about}</p>
            {!a.href && <Pill>Coming soon</Pill>}
          </li>
        ))}
      </ul>
    </PageContainer>
  );
}
