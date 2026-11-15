import { render, screen } from '@testing-library/react';
import { expect, it } from 'vitest';
import { FOOTER_NOTICE, SiteFooter } from './SiteFooter';

it('renders the verbatim public-data notice', () => {
  render(<SiteFooter />);
  expect(FOOTER_NOTICE).toBe(
    'All information on this platform is compiled from publicly available sources published by Ghanaian public institutions, political parties and international organisations. Every figure links to its original source. GPIP is independent and is not affiliated with the Government of Ghana or any political party.',
  );
  expect(screen.getByText(FOOTER_NOTICE)).toBeInTheDocument();
});

it('links to the data notice page', () => {
  render(<SiteFooter />);
  expect(screen.getByRole('link', { name: /data notice/i })).toHaveAttribute(
    'href',
    '/data-notice',
  );
});
