import type { ButtonHTMLAttributes } from 'react';
import styles from './Button.module.css';

const CLASS = {
  primary: 'button',
  quiet: 'button button--quiet',
  link: styles.linkButton,
} as const;

/** Form buttons in the site's three styles. Submits by default. */
export function Button({
  variant = 'primary',
  type = 'submit',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: keyof typeof CLASS | undefined }) {
  // biome-ignore lint/a11y/useButtonType: the type is set from props (default "submit").
  return <button type={type} className={CLASS[variant]} {...props} />;
}
