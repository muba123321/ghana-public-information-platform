import { render, screen } from '@testing-library/react';
import { expect, it } from 'vitest';
import { KIND_LABELS, KindBadge } from './KindBadge';

it('names every commitment kind in plain words, so a manifesto line is never mistaken for a funded project', () => {
  expect(KIND_LABELS).toEqual({
    campaign_promise: 'Campaign promise',
    policy_statement: 'Policy statement',
    approved_programme: 'Approved programme',
    funded_project: 'Funded project',
  });
  render(<KindBadge kind="funded_project" />);
  expect(screen.getByText('Funded project')).toHaveAttribute('data-kind', 'funded_project');
});
