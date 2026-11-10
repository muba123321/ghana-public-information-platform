import { render, screen } from '@testing-library/react';
import { expect, it } from 'vitest';
import { ribbonSegments } from '../lib/timeline';
import { TimelineRibbon } from './TimelineRibbon';

const segments = ribbonSegments(
  [
    {
      slug: '1981-pndc',
      name: 'Provisional National Defence Council',
      kind: 'military',
      startDate: '1981-12-31',
      endDate: '1993-01-07',
    },
    {
      slug: '1993-rawlings-i',
      name: 'Rawlings I',
      kind: 'civilian',
      startDate: '1993-01-07',
      endDate: '1997-01-07',
    },
  ],
  '2026-11-10',
);

it('links every segment to its administration with a readable label', () => {
  render(<TimelineRibbon segments={segments} ticks={[]} />);
  const link = screen.getByRole('link', {
    name: 'Provisional National Defence Council, 1981–1993, military government',
  });
  expect(link).toHaveAttribute('href', '/history/administrations/1981-pndc');
  expect(screen.getAllByRole('link')).toHaveLength(2);
});

it('marks military segments by kind, never by party', () => {
  const { container } = render(<TimelineRibbon segments={segments} ticks={[]} />);
  expect(container.querySelectorAll('[data-kind="military"]')).toHaveLength(1);
});

it('highlights the current administration', () => {
  render(<TimelineRibbon segments={segments} ticks={[]} currentSlug="1993-rawlings-i" />);
  expect(screen.getByRole('link', { current: 'page' })).toHaveAttribute(
    'href',
    '/history/administrations/1993-rawlings-i',
  );
});
