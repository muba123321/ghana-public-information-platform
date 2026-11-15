import type { CommitmentKind } from '@gpip/core';

export const KIND_LABELS: Record<CommitmentKind, string> = {
  campaign_promise: 'Campaign promise',
  policy_statement: 'Policy statement',
  approved_programme: 'Approved programme',
  funded_project: 'Funded project',
};

/** Always shown next to a commitment: a manifesto line is not a funded project. */
export function KindBadge({ kind }: { kind: CommitmentKind }) {
  return (
    <span className="kind-badge" data-kind={kind}>
      {KIND_LABELS[kind]}
    </span>
  );
}
