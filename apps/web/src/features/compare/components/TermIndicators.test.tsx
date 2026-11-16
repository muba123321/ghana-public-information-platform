import type { TenureSummary } from '@gpip/core';
import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { TermIndicators } from './TermIndicators';

const empty: TenureSummary = {
  baseline: null,
  end: null,
  average: null,
  change: null,
  coverage: { withValue: 0, total: 4 },
  sparse: false,
  modelled: false,
  transitionYears: [],
  points: [],
};
const ROWS = [
  {
    code: 'inflation',
    name: 'Inflation',
    unit: '% per year',
    summary: {
      ...empty,
      baseline: { year: 2016, value: 17.5 },
      end: { year: 2020, value: 9.9 },
      average: 11,
      change: -7.6,
      coverage: { withValue: 4, total: 4 },
      points: [2017, 2018, 2019, 2020].map((year) => ({ year, value: 10 })),
    },
  },
  { code: 'poverty', name: 'Poverty', unit: '%', summary: empty },
];

describe('TermIndicators', () => {
  it('shows inherited, last figure with its year, change and coverage', () => {
    render(<TermIndicators slug="2017-akufo-addo-i" rows={ROWS} />);
    const row = screen.getByRole('row', { name: /Inflation/ });
    expect(row).toHaveTextContent('17.5 (2016)');
    expect(row).toHaveTextContent('9.9 (2020)');
    expect(row).toHaveTextContent('-7.6');
    expect(row).toHaveTextContent('4 of 4');
    expect(screen.getByText('Being in office is not the same as causing a change.')).toBeVisible();
  });

  it('shows Not available, never 0, when there are no figures', () => {
    render(<TermIndicators slug="2017-akufo-addo-i" rows={ROWS} />);
    const row = screen.getByRole('row', { name: /Poverty/ });
    expect(within(row).getAllByText(/Not available/).length).toBeGreaterThan(0);
    expect(row).not.toHaveTextContent(/\b0\b(?! of)/);
  });

  it('links each indicator to its page and the term to Compare', () => {
    render(<TermIndicators slug="2017-akufo-addo-i" rows={ROWS} />);
    expect(screen.getAllByRole('link', { name: 'Inflation' })[0]).toHaveAttribute(
      'href',
      '/history/indicators/inflation',
    );
    expect(
      screen.getAllByRole('link', { name: /Compare with another government/ })[0],
    ).toHaveAttribute('href', '/history/compare?a=2017-akufo-addo-i');
  });
});
