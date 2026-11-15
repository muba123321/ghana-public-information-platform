import { ReportQueue } from '@/features/corrections';
import { setCorrectionStatusAction } from '@/features/corrections/server/admin-actions';
import { loadCorrectionReports } from '@/features/corrections/server/admin-queries';
import { requireEditor } from '@/server/editor-access';

export default async function CorrectionsPage() {
  await requireEditor(); // pages render without the layout on client navigations
  return <ReportQueue reports={await loadCorrectionReports()} action={setCorrectionStatusAction} />;
}
