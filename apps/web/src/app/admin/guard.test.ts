import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

// A client-side navigation can render a page without its layout, so the layout's check is not
// enough: every admin page and server action file must check the editor itself.
const root = join(__dirname);
// Signing out needs no editor.
const EXEMPT = new Set(['actions.ts']);
const files = (readdirSync(root, { recursive: true }) as string[]).filter(
  (f) => /(^|\/)(page\.tsx|actions\.ts|route\.ts)$/.test(f) && !EXEMPT.has(f),
);

describe('admin access', () => {
  it('finds the admin pages', () => expect(files.length).toBeGreaterThan(5));

  it.each(files)('%s checks the editor itself', (f) => {
    expect(readFileSync(join(root, f), 'utf8')).toMatch(/await (requireEditor|currentEditor)\(\)/);
  });
});
