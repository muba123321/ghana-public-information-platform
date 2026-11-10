import type { AdministrationSummary } from '@gpip/db';
import { render, screen, within } from '@testing-library/react';
import { expect, it } from 'vitest';
import { AdministrationTimeline } from './AdministrationTimeline';

const ndc = { slug: 'ndc', name: 'National Democratic Congress', abbreviation: 'NDC' };
const npp = { slug: 'npp', name: 'New Patriotic Party', abbreviation: 'NPP' };
const leader = (fullName: string, startDate: string) => ({
  role: 'head_of_state' as const,
  personSlug: fullName.toLowerCase().replaceAll(' ', '-'),
  fullName,
  label: null,
  startDate,
  endDate: null,
});

const items: AdministrationSummary[] = [
  {
    slug: '1981-pndc',
    name: 'Provisional National Defence Council',
    kind: 'military',
    startDate: '1981-12-31',
    endDate: '1993-01-07',
    party: null,
    leaders: [leader('Jerry John Rawlings', '1981-12-31')],
  },
  {
    slug: '2021-akufo-addo-ii',
    name: 'Akufo-Addo II',
    kind: 'civilian',
    startDate: '2021-01-07',
    endDate: '2025-01-07',
    party: npp,
    leaders: [leader('Nana Addo Dankwa Akufo-Addo', '2021-01-07')],
  },
  {
    slug: '2025-mahama-ii',
    name: 'Mahama II',
    kind: 'civilian',
    startDate: '2025-01-07',
    endDate: null,
    party: ndc,
    leaders: [leader('John Dramani Mahama', '2025-01-07')],
  },
];

it('renders administrations in the given order', () => {
  render(<AdministrationTimeline items={items} />);
  const rows = screen.getAllByRole('listitem');
  expect(rows.map((r) => within(r).getByRole('link').textContent)).toEqual([
    expect.stringContaining('Provisional National Defence Council'),
    expect.stringContaining('Akufo-Addo II'),
    expect.stringContaining('Mahama II'),
  ]);
});

it('links each administration to its profile with its year range', () => {
  render(<AdministrationTimeline items={items} />);
  expect(screen.getByRole('link', { name: /1981–1993/ })).toHaveAttribute(
    'href',
    '/history/administrations/1981-pndc',
  );
});

it('shows an incumbent as running to the present', () => {
  render(<AdministrationTimeline items={items} />);
  expect(screen.getByText('7 Jan 2025 – present')).toBeInTheDocument();
});

it('labels military governments instead of showing a party', () => {
  render(<AdministrationTimeline items={items} />);
  const pndc = screen.getAllByRole('listitem')[0]!;
  expect(within(pndc).getByText('Military government')).toBeInTheDocument();
});

it('never derives styling from the party', () => {
  const { container } = render(<AdministrationTimeline items={items} />);
  for (const el of container.querySelectorAll('*')) {
    const attrs =
      `${el.getAttribute('class') ?? ''} ${el.getAttribute('style') ?? ''}`.toLowerCase();
    expect(attrs).not.toMatch(/\b(ndc|npp)\b/);
  }
});

it('labels by kind, so a transitional government is never called military', () => {
  const transitional: AdministrationSummary = {
    ...items[0]!,
    slug: 't',
    name: 'Transitional',
    kind: 'transitional',
    party: null,
  };
  render(<AdministrationTimeline items={[transitional]} />);
  expect(screen.getByText('Transitional government')).toBeInTheDocument();
  expect(screen.queryByText('Military government')).toBeNull();
});
