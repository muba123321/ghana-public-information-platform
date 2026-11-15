/** What each audited table holds, in words. */
export const RECORD_TYPE_LABELS: Record<string, string> = {
  administrations: 'Government',
  administration_leaders: 'Government leaders',
  parties: 'Party',
  persons: 'Person',
  sectors: 'Sector',
  sources: 'Source',
  indicators: 'Indicator',
  context_events: 'Chart event',
  institution_versions: 'Ministry',
  commitments: 'Commitment',
  commitment_stewardships: 'Commitment history',
};
export const CHANGE_ACTION_LABELS = {
  insert: 'Added',
  update: 'Updated',
  delete: 'Removed',
} as const;

/** The public page for a changed record, when it has one. */
export const publicPageFor = (table: string, key: string) =>
  table === 'administrations'
    ? `/history/administrations/${key}`
    : table === 'commitments' || table === 'commitment_stewardships'
      ? `/history/commitments/${key}`
      : table === 'indicators'
        ? `/history/indicators/${key}`
        : null;
