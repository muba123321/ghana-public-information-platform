import type { IsoDate } from '@gpip/core';
import { and, asc, desc, eq, inArray, or } from 'drizzle-orm';
import type { Db } from '../client.ts';
import { institutionLineage, institutions, institutionVersions } from '../schema/index.ts';

export interface InstitutionHistory {
  slug: string;
  kind: string;
  versions: {
    name: string;
    mandate: string | null;
    sectorSlug: string | null;
    validFrom: IsoDate;
    validTo: IsoDate | null;
  }[];
  lineage: { fromSlug: string; toSlug: string; kind: string; effectiveOn: IsoDate }[];
}

/** Institutions with at least one published version (subquery). */
function publishedInstitutions(db: Db) {
  return db
    .selectDistinct({ slug: institutionVersions.institutionSlug })
    .from(institutionVersions)
    .where(eq(institutionVersions.reviewStatus, 'published'));
}

/** Every published name/mandate an institution has had, plus renames/mergers/splits. */
export async function getInstitutionHistory(
  db: Db,
  slug: string,
): Promise<InstitutionHistory | null> {
  const [inst] = await db.select().from(institutions).where(eq(institutions.slug, slug));
  if (!inst) return null;
  const versions = (
    await db
      .select({
        name: institutionVersions.name,
        mandate: institutionVersions.mandate,
        sectorSlug: institutionVersions.sectorSlug,
        validFrom: institutionVersions.validFrom,
        validTo: institutionVersions.validTo,
        reviewStatus: institutionVersions.reviewStatus,
      })
      .from(institutionVersions)
      .where(eq(institutionVersions.institutionSlug, slug))
      .orderBy(asc(institutionVersions.validFrom))
  )
    .filter((v) => v.reviewStatus === 'published')
    .map(({ reviewStatus: _r, ...v }) => v);
  const lineage = await db
    .select({
      fromSlug: institutionLineage.fromSlug,
      toSlug: institutionLineage.toSlug,
      kind: institutionLineage.kind,
      effectiveOn: institutionLineage.effectiveOn,
    })
    .from(institutionLineage)
    .where(
      and(
        or(eq(institutionLineage.fromSlug, slug), eq(institutionLineage.toSlug, slug)),
        // Both ends must be public, or the edge would reveal an unpublished institution.
        inArray(institutionLineage.fromSlug, publishedInstitutions(db)),
        inArray(institutionLineage.toSlug, publishedInstitutions(db)),
      ),
    )
    .orderBy(asc(institutionLineage.effectiveOn));
  return { slug: inst.slug, kind: inst.kind, versions, lineage };
}

export interface InstitutionSummary {
  slug: string;
  kind: string;
  /** Latest published name. */
  name: string;
  sectorSlug: string | null;
  since: IsoDate;
  /** null while the institution exists under this name. */
  until: IsoDate | null;
}

/** Institutions with at least one published version, under their latest published name. */
export async function listInstitutions(db: Db): Promise<InstitutionSummary[]> {
  const rows = await db
    .select({
      slug: institutions.slug,
      kind: institutions.kind,
      name: institutionVersions.name,
      sectorSlug: institutionVersions.sectorSlug,
      since: institutionVersions.validFrom,
      until: institutionVersions.validTo,
    })
    .from(institutionVersions)
    .innerJoin(institutions, eq(institutionVersions.institutionSlug, institutions.slug))
    .where(eq(institutionVersions.reviewStatus, 'published'))
    .orderBy(desc(institutionVersions.validFrom));
  const latest = new Map<string, InstitutionSummary>();
  for (const r of rows) if (!latest.has(r.slug)) latest.set(r.slug, r);
  return [...latest.values()].sort((a, b) => a.name.localeCompare(b.name));
}
