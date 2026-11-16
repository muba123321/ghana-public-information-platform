import type { Metadata } from 'next';
import { type CompareSearch, CompareView, parseCompareParams } from '@/features/compare';
import { loadCompareOptions, loadComparison } from '@/features/compare/server/queries';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Compare governments' };

type Props = { searchParams: Promise<CompareSearch> };

export default async function ComparePage({ searchParams }: Props) {
  const search = await searchParams;
  const options = await loadCompareOptions();
  const selection = parseCompareParams(search, {
    terms: options.terms.map((t) => t.slug),
    persons: options.persons.map((p) => p.slug),
    topics: options.topics.map((t) => t.slug),
  });
  const query = new URLSearchParams({
    ...(selection.by === 'person' ? { by: 'person' } : {}),
    ...Object.fromEntries(selection.slugs.map((s, i) => [['a', 'b', 'c', 'd'][i] as string, s])),
    topic: selection.topic,
  }).toString();
  return (
    <CompareView
      selection={selection}
      options={options}
      comparison={selection.ready ? await loadComparison(selection) : null}
      query={query}
    />
  );
}
