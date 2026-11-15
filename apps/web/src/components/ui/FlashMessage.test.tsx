import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { FlashMessage } from './FlashMessage';
import styles from './FlashMessage.module.css';

describe('FlashMessage', () => {
  it('announces an error', () => {
    render(<FlashMessage flash={{ kind: 'error', text: 'Page must be between 1 and 50.' }} />);
    expect(screen.getByRole('alert')).toHaveTextContent('Page must be between 1 and 50.');
  });

  it('shows a note quietly', () => {
    render(<FlashMessage flash={{ kind: 'note', text: 'Archived.' }} />);
    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.getByText('Archived.')).toHaveClass(styles.formNote as string);
  });

  it('renders nothing without a message', () => {
    const { container } = render(<FlashMessage flash={null} />);
    expect(container).toBeEmptyDOMElement();
  });
});
