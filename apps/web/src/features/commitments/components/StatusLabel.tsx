import type { CommitmentStatus } from '@gpip/core';
import { STATUS_LABELS } from '../labels';
import styles from './StatusLabel.module.css';

/** Descriptive, never judgemental: no "broken", "failed" or "kept". */
export function StatusLabel({ status }: { status: CommitmentStatus }) {
  return (
    <span className={styles.statusLabel} data-status={status}>
      {STATUS_LABELS[status]}
    </span>
  );
}
