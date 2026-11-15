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
  /** A file the rule must reject — proves the check can fail. */
  bad?: { file: string; source: string };
}

/** Module specifiers a file imports at runtime (`import type` lines are skipped). */
const runtimeImports = (src: string) =>
  [...src.matchAll(/^import (?!type )[^;]*?from '([^']+)';/gms)].map((m) => m[1] as string);
const allImports = (src: string) =>
  [...src.matchAll(/^import [^;]*?from '([^']+)';/gms)].map((m) => m[1] as string);
const inServer = (f: string) => /(^|\/)server\//.test(f);
const featureOf = (f: string) => f.match(/^features\/([^/]+)\//)?.[1];

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
    files: (all) =>
      all.filter((f) => !f.endsWith('.tsx') && !isTest(f) && !f.endsWith('.module.css')),
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
    name: 'every CSS module sits beside the component it styles',
    files: (all) => all.filter((f) => f.endsWith('.module.css')),
    check: (f) =>
      ALL.includes(f.replace(/\.module\.css$/, '.tsx')) ? null : 'has no component file beside it',
    bad: { file: 'components/ui/Orphan.module.css', source: '' },
  },
  {
    name: 'global CSS is only the design tokens and base styles',
    files: (all) => all.filter((f) => f.endsWith('.css') && !f.endsWith('.module.css')),
    check: (f) =>
      ['styles/tokens.css', 'styles/base.css'].includes(f)
        ? null
        : 'add styles to a component module instead',
    bad: { file: 'app/globals.css', source: '' },
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
  {
    name: 'only server code imports the database or ingest packages (types excepted)',
    files: (all) => all.filter((f) => /\.tsx?$/.test(f) && !inServer(f)),
    check: (_f, src) => {
      const bad = runtimeImports(src).find((m) => /^@gpip\/(db|ingest)(\/|$)/.test(m));
      return bad ? `imports ${bad} outside a server/ folder` : null;
    },
    bad: { file: 'features/x/components/X.tsx', source: "import { getDb } from '@gpip/db';\n" },
  },
  {
    name: 'UI and shared helpers never import server code',
    files: (all) =>
      all.filter(
        (f) =>
          /\.tsx?$/.test(f) && !isTest(f) && /^(components|lib|features)\//.test(f) && !inServer(f),
      ),
    check: (_f, src) => {
      const bad = allImports(src).find((m) => /(^@\/server\/|\/server\/)/.test(m));
      return bad ? `imports server code (${bad})` : null;
    },
    bad: { file: 'components/ui/X.tsx', source: "import { getDb } from '@/server/db';\n" },
  },
  {
    name: "features use each other only through the other feature's index",
    files: (all) => all.filter((f) => f.startsWith('features/') && /\.tsx?$/.test(f)),
    check: (f, src) => {
      const own = featureOf(f);
      const bad = allImports(src).find((m) => {
        const other = m.match(/^@\/features\/([^/]+)(\/.*)?$/);
        return other && (other[1] === own || other[2] !== undefined);
      });
      return bad
        ? `imports ${bad}; use relative paths inside a feature, @/features/<name> across`
        : null;
    },
    bad: {
      file: 'features/review/components/X.tsx',
      source: "import { KIND_LABELS } from '@/features/commitments/labels';\n",
    },
  },
  {
    name: 'pages are thin: no markup classes, no constant maps, no queries',
    files: (all) => all.filter((f) => f.startsWith('app/') && f.endsWith('page.tsx')),
    check: (_f, src) => {
      if (src.includes('className='))
        return 'has className (move the markup into a feature component)';
      if (/^const [A-Z_]+[^=]*= [{[]/m.test(src))
        return 'defines a constant map (move it to labels.ts)';
      if (allImports(src).includes('drizzle-orm')) return 'imports drizzle-orm';
      return null;
    },
    bad: { file: 'app/x/page.tsx', source: 'const LABELS = { a: 1 };\n' },
  },
];

describe('architecture', () => {
  it.each(RULES.filter((r) => r.bad).map((r) => [r.name, r] as const))(
    'rule "%s" rejects its bad example',
    (_name, rule) => {
      const bad = rule.bad as { file: string; source: string };
      expect(rule.check(bad.file, bad.source)).not.toBeNull();
    },
  );

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
