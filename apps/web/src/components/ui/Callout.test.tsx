import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Callout } from './Callout';
import calloutStyles from './Callout.module.css';
import { Pill } from './Pill';
import pillStyles from './Pill.module.css';

describe('Callout and Pill', () => {
  it('render their text in the shared styles', () => {
    render(
      <>
        <Callout>Documents appear here once they are archived.</Callout>
        <Pill>Draft</Pill>
      </>,
    );
    expect(screen.getByText(/Documents appear/)).toHaveClass(calloutStyles.callout as string);
    expect(screen.getByText('Draft')).toHaveClass(pillStyles.pill as string);
  });
});
