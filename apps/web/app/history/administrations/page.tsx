import { listAdministrations } from '@gpip/db';
import type { Metadata } from 'next';
import { AdministrationTimeline } from '../../../components/AdministrationTimeline';
import { getDb } from '../../../lib/db';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Administration directory' };

export default async function AdministrationsPage() {
  const items = await listAdministrations(await getDb());
  return (
    <>
      <h1>Administration directory</h1>
      <p className="lede">
        Every government of Ghana since independence, in date order — civilian and military.
      </p>
      <AdministrationTimeline items={items} />
    </>
  );
}
