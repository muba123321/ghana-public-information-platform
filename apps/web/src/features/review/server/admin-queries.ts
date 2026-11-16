import 'server-only';
import {
  getReviewItem,
  listAdministrationNames,
  listRegions,
  listReviewQueue,
  listSectors,
  reviewCounts,
} from '@gpip/db';
import { getDb } from '@/server/db';
import { requireEditor } from '@/server/editor-access';

export async function loadReviewCounts() {
  await requireEditor();
  return reviewCounts(await getDb());
}

export async function loadReviewQueue() {
  await requireEditor();
  return listReviewQueue(await getDb());
}

export async function loadReviewItem(slug: string) {
  await requireEditor();
  return getReviewItem(await getDb(), slug);
}

/** Choices for the review form's drop-downs. */
export async function loadReviewOptions() {
  await requireEditor();
  const db = await getDb();
  // Drafts included: a draft commitment may point at a government not yet published.
  const [administrations, sectors, regions] = await Promise.all([
    listAdministrationNames(db),
    listSectors(db),
    listRegions(db),
  ]);
  return {
    administrations,
    sectors,
    // Current regions first, then the former ones (older documents name them).
    regions: regions.map((r) => ({ slug: r.slug, name: r.name, former: r.validTo !== null })),
  };
}
