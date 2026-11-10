import { getAdministration } from '@gpip/db';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getDb } from '../../../../lib/db';
import { formatDate, formatRange } from '../../../../lib/format';

export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ slug: string }> };

const ROLE_LABEL = {
  head_of_state: 'Head of state',
  head_of_government: 'Head of government',
  vice_president: 'Vice-President',
} as const;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const a = await getAdministration(await getDb(), (await params).slug);
  return { title: a?.name ?? 'Administration not found' };
}

export default async function AdministrationPage({ params }: Props) {
  const a = await getAdministration(await getDb(), (await params).slug);
  if (!a) notFound();

  return (
    <>
      <h1>{a.name}</h1>
      <dl className="facts">
        <dt>In office</dt>
        <dd>{formatRange(a.startDate, a.endDate)}</dd>
        <dt>Type</dt>
        <dd>{a.kind === 'military' ? 'Military government' : 'Civilian government'}</dd>
        <dt>Party</dt>
        <dd>
          {a.party ? `${a.party.name} (${a.party.abbreviation})` : 'None — military government'}
        </dd>
      </dl>

      <h2>Leaders</h2>
      <ul className="leaders">
        {a.leaders.map((l) => (
          <li key={`${l.personSlug}-${l.role}-${l.startDate}`}>
            <strong>{l.fullName}</strong>{' '}
            <span className="role">— {l.label ?? ROLE_LABEL[l.role]}</span>
            <br />
            <span>{formatRange(l.startDate, l.endDate ?? a.endDate)}</span>
          </li>
        ))}
      </ul>

      {a.notes && <p className="note">{a.notes}</p>}

      <h2>Commitments, budgets and indicators</h2>
      <p>
        Commitments, budgets and indicators for this administration will appear here as they are
        verified.
      </p>

      <h2>Source</h2>
      <p>
        {a.source.publisher}:{' '}
        <a href={a.source.url} rel="noopener">
          {a.source.title}
        </a>{' '}
        (retrieved {formatDate(a.source.retrievedOn)})
      </p>

      <nav className="pager" aria-label="Neighbouring administrations">
        {a.previous ? (
          <Link href={`/history/administrations/${a.previous.slug}`}>
            ← Previous: {a.previous.name}
          </Link>
        ) : (
          <span />
        )}
        {a.next && (
          <Link href={`/history/administrations/${a.next.slug}`}>Next: {a.next.name} →</Link>
        )}
      </nav>
    </>
  );
}
