import type { CommitmentStatus } from '@gpip/core';
import { STATUS_LABELS } from '../labels';

/** Descriptive, never judgemental: no "broken", "failed" or "kept". */
export function StatusLabel({ status }: { status: CommitmentStatus }) {
  return (
    <span className="status-label" data-status={status}>
      {STATUS_LABELS[status]}
    </span>
  );
}
