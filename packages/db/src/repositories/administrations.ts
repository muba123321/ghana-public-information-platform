import type { AdministrationKind, IsoDate, LeaderRole, Tenure } from '@gpip/core';
import { and, asc, eq, inArray } from 'drizzle-orm';
import type { Db } from '../client.js';
import {
  administrationLeaders,
  administrations,
  parties,
  persons,
  sources,
} from '../schema/index.js';

export interface AdministrationLeader {
  role: LeaderRole;
  personSlug: string;
  fullName: string;
  label: string | null;
  startDate: IsoDate;
  /** null = until the end of the administration (or still serving). */
  endDate: IsoDate | null;
}

export interface AdministrationSummary {
  slug: string;
  name: string;
  kind: AdministrationKind;
  startDate: IsoDate;
  endDate: IsoDate | null;
  party: { slug: string; name: string; abbreviation: string } | null;
  leaders: AdministrationLeader[];
}

export interface AdministrationDetail extends AdministrationSummary {
  notes: string | null;
  source: { title: string; publisher: string; url: string; retrievedOn: IsoDate };
  previous: { slug: string; name: string } | null;
  next: { slug: string; name: string } | null;
}

const published = eq(administrations.reviewStatus, 'published');

async function leadersBySlug(
  db: Db,
  slugs: string[],
): Promise<Map<string, AdministrationLeader[]>> {
  const map = new Map<string, AdministrationLeader[]>(slugs.map((s) => [s, []]));
  if (slugs.length === 0) return map;
  const rows = await db
    .select({
      administrationSlug: administrationLeaders.administrationSlug,
      role: administrationLeaders.role,
      personSlug: administrationLeaders.personSlug,
      fullName: persons.fullName,
      label: administrationLeaders.label,
      startDate: administrationLeaders.startDate,
      endDate: administrationLeaders.endDate,
    })
    .from(administrationLeaders)
    .innerJoin(persons, eq(administrationLeaders.personSlug, persons.slug))
    .where(inArray(administrationLeaders.administrationSlug, slugs))
    .orderBy(asc(administrationLeaders.startDate), asc(administrationLeaders.role));
  for (const { administrationSlug, ...leader } of rows) map.get(administrationSlug)?.push(leader);
  return map;
}

function summaryQuery(db: Db) {
  return db
    .select({
      slug: administrations.slug,
      name: administrations.name,
      kind: administrations.kind,
      startDate: administrations.startDate,
      endDate: administrations.endDate,
      notes: administrations.notes,
      sourceId: administrations.sourceId,
      partySlug: parties.slug,
      partyName: parties.name,
      partyAbbreviation: parties.abbreviation,
    })
    .from(administrations)
    .leftJoin(parties, eq(administrations.partySlug, parties.slug));
}

type SummaryRow = Awaited<ReturnType<ReturnType<typeof summaryQuery>['where']>>[number];

function toSummary(r: SummaryRow, leaders: AdministrationLeader[]): AdministrationSummary {
  return {
    slug: r.slug,
    name: r.name,
    kind: r.kind,
    startDate: r.startDate,
    endDate: r.endDate,
    party: r.partySlug
      ? { slug: r.partySlug, name: r.partyName ?? '', abbreviation: r.partyAbbreviation ?? '' }
      : null,
    leaders,
  };
}

/** All published administrations in chronological order. */
export async function listAdministrations(db: Db): Promise<AdministrationSummary[]> {
  const rows = await summaryQuery(db).where(published).orderBy(asc(administrations.startDate));
  const leaders = await leadersBySlug(
    db,
    rows.map((r) => r.slug),
  );
  return rows.map((r) => toSummary(r, leaders.get(r.slug) ?? []));
}

export async function getAdministration(
  db: Db,
  slug: string,
): Promise<AdministrationDetail | null> {
  const timeline = await db
    .select({ slug: administrations.slug, name: administrations.name })
    .from(administrations)
    .where(published)
    .orderBy(asc(administrations.startDate));
  const i = timeline.findIndex((a) => a.slug === slug);
  if (i === -1) return null;

  const [row] = await summaryQuery(db).where(and(published, eq(administrations.slug, slug)));
  if (!row) return null;
  const [source] = await db
    .select({
      title: sources.title,
      publisher: sources.publisher,
      url: sources.url,
      retrievedOn: sources.retrievedOn,
    })
    .from(sources)
    .where(eq(sources.id, row.sourceId));
  if (!source) throw new Error(`Administration ${slug} has no source row`);
  const leaders = await leadersBySlug(db, [slug]);

  return {
    ...toSummary(row, leaders.get(slug) ?? []),
    notes: row.notes,
    source,
    previous: timeline[i - 1] ?? null,
    next: timeline[i + 1] ?? null,
  };
}

/**
 * "Compare by person": the periods a person led an administration as head of state or
 * government, derived from leader records (one source of truth, handles mid-term successions).
 */
export async function listPersonTenures(db: Db, personSlug: string): Promise<Tenure[]> {
  const rows = await db
    .select({
      slug: administrations.slug,
      start: administrationLeaders.startDate,
      end: administrationLeaders.endDate,
      adminEnd: administrations.endDate,
    })
    .from(administrationLeaders)
    .innerJoin(administrations, eq(administrationLeaders.administrationSlug, administrations.slug))
    .where(
      and(
        published,
        eq(administrationLeaders.personSlug, personSlug),
        inArray(administrationLeaders.role, ['head_of_state', 'head_of_government']),
      ),
    )
    .orderBy(asc(administrationLeaders.startDate));

  const tenures: Tenure[] = [];
  for (const r of rows) {
    const end = r.end ?? r.adminEnd;
    const prev = tenures.at(-1);
    // Merge contiguous rows within one administration (e.g. a change of title mid-tenure).
    if (prev && prev.slug === r.slug && prev.end === r.start) prev.end = end;
    else tenures.push({ slug: r.slug, start: r.start, end });
  }
  return tenures;
}
