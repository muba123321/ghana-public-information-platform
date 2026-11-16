export type CompareBy = 'term' | 'person';

export interface CompareSelection {
  by: CompareBy;
  /** Two to four governments (by term) or people (by person), in the order chosen. */
  slugs: string[];
  /** A sector slug. */
  topic: string;
}

/** The query string as the browser sends it: a–d are the chosen governments or people. */
export type CompareSearch = Partial<Record<'by' | 'a' | 'b' | 'c' | 'd' | 'topic', string>>;

const SLOTS = ['a', 'b', 'c', 'd'] as const;

/** Only real, distinct choices are kept; anything else in the URL is ignored. */
export function parseCompareParams(
  search: CompareSearch,
  known: { terms: readonly string[]; persons: readonly string[]; topics: readonly string[] },
): CompareSelection & { ready: boolean } {
  const by: CompareBy = search.by === 'person' ? 'person' : 'term';
  const allowed = by === 'person' ? known.persons : known.terms;
  const slugs = [
    ...new Set(SLOTS.map((k) => search[k]).filter((s): s is string => !!s && allowed.includes(s))),
  ];
  const topic =
    search.topic && known.topics.includes(search.topic) ? search.topic : (known.topics[0] ?? '');
  return { by, slugs, topic, ready: slugs.length >= 2 };
}
