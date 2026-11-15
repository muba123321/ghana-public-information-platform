import 'server-only';
import { listCorrectionReports } from '@gpip/db';
import { getDb } from '@/server/db';
import { requireEditor } from '@/server/editor-access';

export async function loadCorrectionReports() {
  await requireEditor();
  return listCorrectionReports(await getDb());
}
