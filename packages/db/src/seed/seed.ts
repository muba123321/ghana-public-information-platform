import {
  AdministrationSeedSchema,
  LeaderSeedSchema,
  PartySeedSchema,
  PersonSeedSchema,
  SectorSeedSchema,
  SourceSeedSchema,
} from '@gpip/core';
import type { Db } from '../client.js';
import {
  administrationLeaders,
  administrations,
  parties,
  persons,
  sectors,
  sources,
} from '../schema/index.js';
import { administrationSeeds } from './data/administrations.js';
import { leaderSeeds } from './data/leaders.js';
import { partySeeds } from './data/parties.js';
import { personSeeds } from './data/persons.js';
import { sectorSeeds } from './data/sectors.js';
import { sourceSeeds } from './data/sources.js';
import { type SyncResult, syncRows } from './sync.js';

/** Idempotently loads the verified reference data. Safe to run on every deploy. */
export async function seed(db: Db): Promise<SyncResult> {
  const src = sourceSeeds.map((s) => SourceSeedSchema.parse(s));
  const admins = administrationSeeds.map((a) => AdministrationSeedSchema.parse(a));
  const leaders = leaderSeeds.map((l) => LeaderSeedSchema.parse(l));

  return db.transaction(async (tx) => {
    const total: SyncResult = { inserted: 0, updated: 0 };
    const add = (r: SyncResult) => {
      total.inserted += r.inserted;
      total.updated += r.updated;
    };

    add(
      await syncRows(
        tx,
        sources,
        'sources',
        ['url', 'title'],
        src.map(({ key: _key, ...s }) => s),
      ),
    );
    const sourceRows = await tx
      .select({ id: sources.id, url: sources.url, title: sources.title })
      .from(sources);
    const sourceId = (key: string) => {
      const s = src.find((x) => x.key === key);
      const row = s && sourceRows.find((r) => r.url === s.url && r.title === s.title);
      if (!row) throw new Error(`Unknown sourceKey: ${key}`);
      return row.id;
    };

    add(
      await syncRows(
        tx,
        parties,
        'parties',
        ['slug'],
        partySeeds.map((p) => PartySeedSchema.parse(p)),
      ),
    );
    add(
      await syncRows(
        tx,
        persons,
        'persons',
        ['slug'],
        personSeeds.map((p) => PersonSeedSchema.parse(p)),
      ),
    );
    add(
      await syncRows(
        tx,
        sectors,
        'sectors',
        ['slug'],
        sectorSeeds.map((s) => SectorSeedSchema.parse(s)),
      ),
    );
    add(
      await syncRows(
        tx,
        administrations,
        'administrations',
        ['slug'],
        admins.map(({ sourceKey, notes, ...a }) => ({
          ...a,
          notes: notes ?? null,
          sourceId: sourceId(sourceKey),
          reviewStatus: 'published',
          provenance: 'manual',
        })),
      ),
    );
    add(
      await syncRows(
        tx,
        administrationLeaders,
        'administration_leaders',
        ['administrationSlug', 'personSlug', 'role', 'startDate'],
        leaders.map(({ sourceKey, label, ...l }) => ({
          ...l,
          label: label ?? null,
          sourceId: sourceId(sourceKey),
        })),
      ),
    );
    return total;
  });
}
