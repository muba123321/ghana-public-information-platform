import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Callout } from './Callout';
import { Pill } from './Pill';

describe('Callout and Pill', () => {
  it('render their text in the shared styles', () => {
    render(
      <>
        <Callout>Documents appear here once they are archived.</Callout>
        <Pill>Draft</Pill>
      </>,
    );
    expect(screen.getByText(/Documents appear/)).toHaveClass('callout');
    expect(screen.getByText('Draft')).toHaveClass('pill');
  });
});
