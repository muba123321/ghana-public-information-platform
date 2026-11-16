import {
  type Frequency,
  type IsoDate,
  type LeaderTerm,
  leaderStretches,
  type ObservationPoint,
  type Tenure,
  type TenureSummary,
  tenureSummary,
} from '@gpip/core';
import type { ContextEvent } from '@gpip/db';
import { yearRange } from '@/lib/format';
import type { CompareBy, CompareSelection } from './compare-params';

export type Tone = 'a' | 'b' | 'c' | 'd';
const TONES: readonly Tone[] = ['a', 'b', 'c', 'd'];

/** A government with its name and leader records. */
export type NamedTerm = LeaderTerm & { name: string };

/** One chosen government or person; a person may have several separate stretches in office. */
export interface ComparedTenure {
  key: string;
  label: string;
  years: string;
  /** Position in the selection — never a party colour. */
  tone: Tone;
  tenures: Tenure[];
}

export interface ComparisonRow {
  tenureKey: string;
  /** "Kufuor I" by term; "Jerry John Rawlings (1981–2001)" by person. */
  stretchLabel: string;
  tone: Tone;
  summary: TenureSummary;
}

export interface ComparisonIndicator {
  code: string;
  name: string;
  unit: string;
  rows: ComparisonRow[];
}

export interface Comparison {
  by: CompareBy;
  topic: string;
  tenures: ComparedTenure[];
  indicators: ComparisonIndicator[];
  /** Dated events inside any compared government's time in office. */
  events: { date: IsoDate; title: string; url: string; publisher: string }[];
}

export interface ComparisonIndicatorInput {
  code: string;
  name: string;
  unit: string;
  frequency: Frequency;
  points: ObservationPoint[];
}

/** Everyone who could be chosen, for the picker: governments by term, or people. */
export function compareChoices(terms: readonly NamedTerm[]) {
  // Each person once, in order of when they first led a government, with every period in full.
  const people = new Map<string, { slug: string; name: string; periods: string[] }>();
  for (const s of leaderStretches(terms)) {
    const p = people.get(s.personSlug) ?? { slug: s.personSlug, name: s.fullName, periods: [] };
    p.periods.push(yearRange(s.start, s.end));
    people.set(s.personSlug, p);
  }
  return {
    terms: terms.map((t) => ({ slug: t.slug, name: t.name, years: yearRange(t.start, t.end) })),
    persons: [...people.values()].map((p) => ({
      slug: p.slug,
      name: p.name,
      years: p.periods.join('; '),
    })),
  };
}

export function buildComparison(input: {
  selection: CompareSelection;
  terms: readonly NamedTerm[];
  indicators: readonly ComparisonIndicatorInput[];
  events: readonly ContextEvent[];
  today: IsoDate;
}): Comparison {
  const { selection, terms, today } = input;
  const stretches = leaderStretches(terms);
  // Periods are associated against every government (or every leader stretch) — not only the chosen ones.
  const all: Tenure[] =
    selection.by === 'person'
      ? stretches
      : terms.map((t) => ({ slug: t.slug, start: t.start, end: t.end }));

  const tenures: ComparedTenure[] = selection.slugs.map((slug, i) => {
    const tone = TONES[i] as Tone;
    if (selection.by === 'person') {
      const own = stretches.filter((s) => s.personSlug === slug);
      return {
        key: slug,
        label: own[0]?.fullName ?? slug,
        years: own.map((s) => yearRange(s.start, s.end)).join(', '),
        tone,
        tenures: own,
      };
    }
    const t = terms.find((x) => x.slug === slug);
    return {
      key: slug,
      label: t?.name ?? slug,
      years: t ? yearRange(t.start, t.end) : '',
      tone,
      tenures: t ? [{ slug: t.slug, start: t.start, end: t.end }] : [],
    };
  });

  const indicators = input.indicators.map((ind) => ({
    code: ind.code,
    name: ind.name,
    unit: ind.unit,
    rows: tenures.flatMap((c) =>
      c.tenures.map((t) => ({
        tenureKey: c.key,
        stretchLabel:
          selection.by === 'person' ? `${c.label} (${yearRange(t.start, t.end)})` : c.label,
        tone: c.tone,
        summary: tenureSummary(ind.points, t, all, ind.frequency, today),
      })),
    ),
  }));

  const during = (d: IsoDate) =>
    tenures.some((c) => c.tenures.some((t) => d >= t.start && d < (t.end ?? today)));
  const events = input.events
    .filter((e) => during(e.date))
    .map((e) => ({
      date: e.date,
      title: e.title,
      url: e.source.url,
      publisher: e.source.publisher,
    }));

  return { by: selection.by, topic: selection.topic, tenures, indicators, events };
}
