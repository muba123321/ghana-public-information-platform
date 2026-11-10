import type { IsoDate } from '@gpip/core';
import { asc, eq, or } from 'drizzle-orm';
import type { Db } from '../client.js';
import { institutionLineage, institutions, institutionVersions } from '../schema/index.js';

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
    .where(or(eq(institutionLineage.fromSlug, slug), eq(institutionLineage.toSlug, slug)))
    .orderBy(asc(institutionLineage.effectiveOn));
  return { slug: inst.slug, kind: inst.kind, versions, lineage };
}
