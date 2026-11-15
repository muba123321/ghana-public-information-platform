import { asc } from 'drizzle-orm';
import type { Db } from '../client.ts';
import { sectors } from '../schema/index.ts';

/** Every sector, by name. */
export function listSectors(db: Db): Promise<{ slug: string; name: string }[]> {
  return db
    .select({ slug: sectors.slug, name: sectors.name })
    .from(sectors)
    .orderBy(asc(sectors.name));
}
