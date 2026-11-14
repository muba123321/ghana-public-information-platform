import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { MoneyList } from './MoneyList';
import { STATUS_LABELS, StatusLabel } from './StatusLabel';
import { StewardshipTimeline } from './StewardshipTimeline';

const s = (
  administrationSlug: string,
  administrationName: string,
  startDate: string,
  progressAtStart: number | null,
  progressAtEnd: number | null,
) => ({
  administrationSlug,
  administrationName,
  startDate,
  endDate: null,
  progressAtStart,
  progressAtEnd,
  status: 'in_progress' as const,
  notes: null,
});
const timeline = ['2009-mills-mahama', '2013-mahama-i', '2017-akufo-addo-i'];

describe('StewardshipTimeline', () => {
  it('shows each government with its own share of progress', () => {
    render(
      <StewardshipTimeline
        stewardships={[
          s('2013-mahama-i', 'Mahama I', '2013-01-07', 0, 40),
          s('2017-akufo-addo-i', 'Akufo-Addo I', '2017-01-07', 40, 100),
        ]}
        timeline={timeline}
      />,
    );
    const items = screen.getAllByRole('listitem');
    expect(items).toHaveLength(2);
    expect(within(items[0]!).getByText('+40 points')).toBeInTheDocument();
    expect(within(items[1]!).getByText('+60 points')).toBeInTheDocument();
    expect(within(items[1]!).getByText('40% → 100%')).toBeInTheDocument();
  });

  it('says Not available when progress is unknown, never zero', () => {
    render(
      <StewardshipTimeline
        stewardships={[s('2013-mahama-i', 'Mahama I', '2013-01-07', 0, null)]}
        timeline={timeline}
      />,
    );
    expect(screen.getByText(/Not available/)).toBeInTheDocument();
    expect(screen.queryByText('+0 points')).toBeNull();
  });

  it('uses neutral tones by position in the timeline, never by party', () => {
    const { container } = render(
      <StewardshipTimeline
        stewardships={[
          s('2013-mahama-i', 'M', '2013-01-07', 0, 1),
          s('2017-akufo-addo-i', 'A', '2017-01-07', 1, 2),
        ]}
        timeline={timeline}
      />,
    );
    expect(
      [...container.querySelectorAll('[data-tone]')].map((e) => e.getAttribute('data-tone')),
    ).toEqual(['b', 'a']);
  });
});

describe('MoneyList', () => {
  it('keeps currencies separate and says when spending is not available', () => {
    render(
      <MoneyList
        budgets={[
          {
            kind: 'allocated',
            amount: 1_200_000_000,
            currency: 'GHS',
            fiscalYear: 2016,
            source: 'MoF',
          },
          {
            kind: 'allocated',
            amount: 90_000_000,
            currency: 'USD',
            fiscalYear: 2018,
            source: 'MoF',
          },
          {
            kind: 'allocated',
            amount: 5_000_000_000,
            currency: 'GHC',
            fiscalYear: 2005,
            source: 'MoF',
          },
        ]}
      />,
    );
    expect(screen.getByText('GH₵1,200,000,000')).toBeInTheDocument();
    expect(screen.getByText('US$90,000,000')).toBeInTheDocument();
    expect(screen.getByText('¢5,000,000,000 (old cedis)')).toBeInTheDocument();
    const spent = screen.getByText('Spent', { selector: 'dt' }).parentElement!;
    expect(within(spent).getByText('Not available')).toBeInTheDocument();
    const released = screen.getByText('Released', { selector: 'dt' }).parentElement!;
    expect(within(released).getByText('Not available')).toBeInTheDocument();
  });
});

describe('StatusLabel', () => {
  it('uses neutral words only', () => {
    expect(Object.values(STATUS_LABELS).join(' ')).not.toMatch(/broken|fail|kept|lie/i);
    render(<StatusLabel status="insufficient_evidence" />);
    expect(screen.getByText('Not enough evidence published')).toBeInTheDocument();
  });
});
