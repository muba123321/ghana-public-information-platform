import type { CommitmentKind } from '@gpip/core';
import { KIND_LABELS } from '../labels';

/** Always shown next to a commitment: a manifesto line is not a funded project. */
export function KindBadge({ kind }: { kind: CommitmentKind }) {
  return (
    <span className="kind-badge" data-kind={kind}>
      {KIND_LABELS[kind]}
    </span>
  );
}
