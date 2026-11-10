import {
  type AdministrationSeed,
  AdministrationSeedSchema,
  type LeaderSeed,
  LeaderSeedSchema,
  type PartySeed,
  PartySeedSchema,
  type PersonSeed,
  PersonSeedSchema,
  type SectorSeed,
  SectorSeedSchema,
  type SourceSeed,
  SourceSeedSchema,
} from '@gpip/core';
import type { Db } from '../client.ts';
import {
  administrationLeaders,
  administrations,
  parties,
  persons,
  sectors,
  sources,
} from '../schema/index.ts';
import { administrationSeeds } from './data/administrations.ts';
import { leaderSeeds } from './data/leaders.ts';
import { partySeeds } from './data/parties.ts';
import { personSeeds } from './data/persons.ts';
import { sectorSeeds } from './data/sectors.ts';
import { sourceSeeds } from './data/sources.ts';
import { type SyncResult, syncRows } from './sync.ts';

export interface SeedData {
  sources: SourceSeed[];
  parties: PartySeed[];
  persons: PersonSeed[];
  sectors: SectorSeed[];
  administrations: AdministrationSeed[];
  leaders: LeaderSeed[];
}

export const defaultSeedData: SeedData = {
  sources: sourceSeeds,
  parties: partySeeds,
  persons: personSeeds,
  sectors: sectorSeeds,
  administrations: administrationSeeds,
  leaders: leaderSeeds,
};

/** Idempotently loads the verified reference data. Safe to run on every deploy. */
export async function seed(db: Db, data: SeedData = defaultSeedData): Promise<SyncResult> {
  const src = data.sources.map((s) => SourceSeedSchema.parse(s));
  const admins = data.administrations.map((a) => AdministrationSeedSchema.parse(a));
  const leaders = data.leaders.map((l) => LeaderSeedSchema.parse(l));

  return db.transaction(async (tx) => {
    const total: SyncResult = { inserted: 0, updated: 0, deleted: 0 };
    const add = (r: SyncResult) => {
      total.inserted += r.inserted;
      total.updated += r.updated;
      total.deleted += r.deleted;
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
        data.parties.map((p) => PartySeedSchema.parse(p)),
      ),
    );
    add(
      await syncRows(
        tx,
        persons,
        'persons',
        ['slug'],
        data.persons.map((p) => PersonSeedSchema.parse(p)),
      ),
    );
    add(
      await syncRows(
        tx,
        sectors,
        'sectors',
        ['slug'],
        data.sectors.map((s) => SectorSeedSchema.parse(s)),
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
        { prune: true },
      ),
    );
    return total;
  });
}
