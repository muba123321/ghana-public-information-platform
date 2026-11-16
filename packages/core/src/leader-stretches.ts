import type { IsoDate } from './period.ts';
import type { LeaderRole } from './schemas.ts';
import type { Tenure } from './tenure.ts';

/** A government with its leader records (as stored), for comparing by person. */
export interface LeaderTerm {
  slug: string;
  start: IsoDate;
  end: IsoDate | null;
  leaders: {
    role: LeaderRole;
    personSlug: string;
    fullName: string;
    startDate: IsoDate;
    /** null = until the end of the term. */
    endDate: IsoDate | null;
  }[];
}

/** One continuous stretch in which one person led the government. slug = `${personSlug}-${startYear}`. */
export interface LeaderStretch extends Tenure {
  personSlug: string;
  fullName: string;
}

const OPEN = '9999-12-31';
const PRIORITY: Partial<Record<LeaderRole, number>> = { head_of_government: 0, head_of_state: 1 };

/**
 * Who led each government, and when. The head of government leads where there is one (Nkrumah
 * 1957–60, Busia 1969–72); otherwise the head of state. Handovers split a term at the leader's
 * dates; the same person continuing into the next term joins one stretch; separate periods in
 * office stay separate. Ordered by start.
 */
export function leaderStretches(terms: readonly LeaderTerm[]): LeaderStretch[] {
  const pieces: LeaderStretch[] = [];
  for (const t of [...terms].sort((a, b) => a.start.localeCompare(b.start))) {
    const termEnd = t.end ?? OPEN;
    const cuts = [
      ...new Set([
        t.start,
        termEnd,
        ...t.leaders.flatMap((l) => [l.startDate, l.endDate ?? termEnd]),
      ]),
    ]
      .filter((d) => d >= t.start && d <= termEnd)
      .sort();
    for (let i = 0; i < cuts.length - 1; i++) {
      const from = cuts[i] as IsoDate;
      const to = cuts[i + 1] as IsoDate;
      const leader = t.leaders
        .filter((l) => l.role in PRIORITY && l.startDate <= from && (l.endDate ?? termEnd) > from)
        .sort(
          (a, b) =>
            (PRIORITY[a.role] ?? 9) - (PRIORITY[b.role] ?? 9) ||
            a.startDate.localeCompare(b.startDate),
        )[0];
      if (!leader) continue;
      const end = to === OPEN ? null : to;
      const prev = pieces.at(-1);
      if (prev && prev.personSlug === leader.personSlug && prev.end === from) {
        prev.end = end;
      } else {
        pieces.push({
          slug: `${leader.personSlug}-${from.slice(0, 4)}`,
          personSlug: leader.personSlug,
          fullName: leader.fullName,
          start: from,
          end,
        });
      }
    }
  }
  return pieces;
}
