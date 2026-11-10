import { describe, expect, it } from 'vitest';
import { associate } from './attribution.js';
import { annualPeriod } from './period.js';
import type { Tenure } from './tenure.js';

const TODAY = '2026-11-09';
const t: Tenure[] = [
  { slug: '1978-smc-ii', start: '1978-07-05', end: '1979-06-04' },
  { slug: '1979-afrc', start: '1979-06-04', end: '1979-09-24' },
  { slug: '1979-third-republic', start: '1979-09-24', end: '1981-12-31' },
  { slug: '2021-akufo-addo-ii', start: '2021-01-07', end: '2025-01-07' },
  { slug: '2025-mahama-ii', start: '2025-01-07', end: null },
];

describe('associate', () => {
  it('assigns a handover year to the majority holder and flags it', () => {
    const a = associate(annualPeriod(2025), t, TODAY);
    expect(a).toMatchObject({ primary: '2025-mahama-ii', transition: true });
    expect(a.shares.map((s) => s.days)).toEqual([6, 359]);
  });

  it('uses plurality when three governments share a year (1979)', () => {
    const a = associate(annualPeriod(1979), t, TODAY);
    expect(a.primary).toBe('1978-smc-ii');
    expect(a.transition).toBe(true);
    expect(a.shares).toEqual([
      { slug: '1978-smc-ii', days: 154 },
      { slug: '1979-afrc', days: 112 },
      { slug: '1979-third-republic', days: 99 },
    ]);
  });

  it('treats the incumbent as ongoing to today', () => {
    expect(associate(annualPeriod(2026), t, TODAY)).toEqual({
      primary: '2025-mahama-ii',
      transition: false,
      shares: [{ slug: '2025-mahama-ii', days: 312 }],
    });
  });

  it('returns no association before 1957', () => {
    expect(associate(annualPeriod(1950), t, TODAY)).toEqual({
      primary: null,
      transition: false,
      shares: [],
    });
  });

  it('returns no association for a future period', () => {
    expect(associate(annualPeriod(2030), t, TODAY).primary).toBeNull();
  });

  it('breaks exact ties toward the earlier tenure regardless of input order', () => {
    const tied: Tenure[] = [
      { slug: 'later', start: '2000-01-06', end: '2000-02-01' },
      { slug: 'earlier', start: '1999-01-01', end: '2000-01-06' },
    ];
    const a = associate({ start: '2000-01-01', end: '2000-01-11' }, tied, TODAY);
    expect(a.primary).toBe('earlier');
    expect(a.shares.map((s) => s.slug)).toEqual(['earlier', 'later']);
  });
});
