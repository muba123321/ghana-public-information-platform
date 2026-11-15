import type { CommitmentStatus } from '@gpip/core';

/** Descriptive, never judgemental: no "broken", "failed" or "kept". */
export const STATUS_LABELS: Record<CommitmentStatus, string> = {
  not_started: 'Not started',
  in_progress: 'In progress',
  completed: 'Completed',
  partially_completed: 'Partly completed',
  stalled: 'Stalled',
  discontinued: 'Discontinued',
  superseded: 'Replaced by a later commitment',
  insufficient_evidence: 'Not enough evidence published',
};

export function StatusLabel({ status }: { status: CommitmentStatus }) {
  return (
    <span className="status-label" data-status={status}>
      {STATUS_LABELS[status]}
    </span>
  );
}
