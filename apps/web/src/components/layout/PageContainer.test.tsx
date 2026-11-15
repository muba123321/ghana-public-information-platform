import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PageContainer } from './PageContainer';
import styles from './PageContainer.module.css';

describe('PageContainer', () => {
  it('wraps a page in the site container', () => {
    const { container } = render(<PageContainer>x</PageContainer>);
    expect(container.firstElementChild).toHaveClass('container', 'page');
    expect(container.firstElementChild).not.toHaveClass(styles.prose as string);
  });

  it('can set long-form text', () => {
    const { container } = render(<PageContainer prose>x</PageContainer>);
    expect(container.firstElementChild).toHaveClass('container', 'page', styles.prose as string);
  });
});
