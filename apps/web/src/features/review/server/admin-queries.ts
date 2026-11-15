import 'server-only';
import {
  getReviewItem,
  listAdministrations,
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
  const [administrations, sectors] = await Promise.all([listAdministrations(db), listSectors(db)]);
  return {
    administrations: administrations.map(({ slug, name }) => ({ slug, name })),
    sectors,
  };
}
