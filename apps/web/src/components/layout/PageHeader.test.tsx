import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PageHeader } from './PageHeader';

describe('PageHeader', () => {
  it('shows the back link before the title, then the lede', () => {
    const { container } = render(
      <PageHeader
        title="Inflation"
        lede="Consumer prices"
        back={{ href: '/history/indicators', label: 'All indicators' }}
      />,
    );
    expect(screen.getByRole('link', { name: 'All indicators' })).toHaveAttribute(
      'href',
      '/history/indicators',
    );
    expect(screen.getByRole('heading', { level: 1, name: 'Inflation' })).toHaveClass('page-title');
    expect(container.textContent).toBe('All indicatorsInflationConsumer prices');
  });

  it('renders only the title when nothing else is given', () => {
    const { container } = render(<PageHeader title="Editor" />);
    expect(container.children).toHaveLength(1);
  });
});
