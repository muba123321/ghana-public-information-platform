import { readdirSync, readFileSync } from 'node:fs';
import { basename, dirname, join, sep } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * The web app's structure rules (see AGENTS.md, "apps/web structure"). Each rule names the files it
 * covers; a rule that covers no files fails, so a typo can never make it pass silently.
 */

const SRC = __dirname;
const ALL = (readdirSync(SRC, { recursive: true }) as string[])
  .map((f) => f.split(sep).join('/'))
  .filter((f) => /\.(tsx?|css)$/.test(f));
const read = (f: string) => readFileSync(join(SRC, f), 'utf8');
const isTest = (f: string) => /\.test\.tsx?$/.test(f);
const inApp = (f: string) => f.startsWith('app/');

interface Rule {
  name: string;
  /** Files the rule applies to. */
  files: (all: readonly string[]) => string[];
  /** A problem with this file, or null. */
  check: (file: string, source: string) => string | null;
}

const NEXT_FOLDER = /^(\[[^\]]+\]|\[\.\.\.[^\]]+\]|\([a-z-]+\)|[a-z0-9-]+\.csv)$/;
const KEBAB = /^[a-z0-9-]+$/;

const RULES: Rule[] = [
  {
    name: 'every server file is walled off from the browser',
    files: (all) => all.filter((f) => /(^|\/)server\/[^/]+\.ts$/.test(f) && !isTest(f)),
    check: (_f, src) =>
      src
        .split('\n')
        .slice(0, 3)
        .some((l) => l.trim() === "import 'server-only';")
        ? null
        : "missing import 'server-only' in its first 3 lines",
  },
  {
    name: 'components are PascalCase files named after their component',
    files: (all) => all.filter((f) => f.endsWith('.tsx') && !inApp(f) && !isTest(f)),
    check: (f, src) => {
      const name = basename(f, '.tsx');
      if (!/^[A-Z][A-Za-z0-9]*$/.test(name)) return 'component file must be PascalCase';
      return new RegExp(`export (async )?function ${name}\\b`).test(src)
        ? null
        : `must export a component named ${name}`;
    },
  },
  {
    name: 'other files and folders are kebab-case',
    files: (all) => all.filter((f) => !f.endsWith('.tsx') && !isTest(f)),
    check: (f) => {
      const stem = basename(f).replace(/(\.module)?\.(ts|css)$/, '');
      if (!KEBAB.test(stem)) return `file name "${basename(f)}" is not kebab-case`;
      const bad = dirname(f)
        .split('/')
        .filter((d) => d !== '.' && !KEBAB.test(d) && !NEXT_FOLDER.test(d));
      return bad.length ? `folder "${bad[0]}" is not kebab-case` : null;
    },
  },
  {
    name: 'every editor-only server function checks the editor first',
    files: (all) => all.filter((f) => /(^|\/)admin-(actions|queries)\.ts$/.test(f)),
    check: (_f, src) => {
      const fns = src.split(/(?=export async function )/).slice(1);
      if (fns.length === 0) return 'exports no functions';
      const open = fns.filter((body) => !body.includes('await requireEditor()'));
      return open.length
        ? `${open.map((b) => b.match(/function (\w+)/)?.[1]).join(', ')} must await requireEditor()`
        : null;
    },
  },
  {
    name: 'every editor page and route checks the editor',
    files: (all) => all.filter((f) => /^app\/admin\/.*(page\.tsx|route\.ts)$/.test(f)),
    check: (_f, src) =>
      /await (requireEditor|currentEditor)\(\)/.test(src) ? null : 'must check the editor',
  },
];

describe('architecture', () => {
  it('keeps editor-only server code inside features, never in routes', () => {
    const admin = ALL.filter((f) => /admin-(actions|queries)\.ts$/.test(f));
    expect(admin.filter((f) => f.startsWith('app/'))).toEqual([]);
    for (const feature of ['corrections', 'review', 'documents']) {
      for (const kind of ['actions', 'queries']) {
        expect(admin).toContain(`features/${feature}/server/admin-${kind}.ts`);
      }
    }
  });

  for (const rule of RULES) {
    describe(rule.name, () => {
      const files = rule.files(ALL);
      it('covers at least one file', () => expect(files.length).toBeGreaterThan(0));
      it.each(files)('%s', (f) => expect(rule.check(f, read(f))).toBeNull());
    });
  }
});
