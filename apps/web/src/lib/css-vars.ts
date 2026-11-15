import type { CSSProperties } from 'react';

/**
 * Data-driven values (a bar's position, an animation delay) go to CSS as custom properties; the
 * rules that use them stay in the component's CSS module.
 */
export const cssVars = (vars: Record<`--${string}`, string>): CSSProperties =>
  vars as CSSProperties;
