import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Button } from './Button';

describe('Button', () => {
  it.each([
    [undefined, 'button'],
    ['quiet', 'button button--quiet'],
    ['link', 'link-button'],
  ] as const)('variant %s has class %s', (variant, cls) => {
    render(<Button variant={variant}>Go</Button>);
    expect(screen.getByRole('button', { name: 'Go' }).className).toBe(cls);
  });

  it('submits forms by default and passes attributes through', () => {
    render(
      <Button name="status" value="reviewed">
        Mark
      </Button>,
    );
    const b = screen.getByRole('button');
    expect(b).toHaveAttribute('type', 'submit');
    expect(b).toHaveAttribute('value', 'reviewed');
  });
});
