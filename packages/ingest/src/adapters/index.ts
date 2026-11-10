import { fileURLToPath } from 'node:url';
import type { SourceAdapter } from '../types.ts';
import { fixtureGetter } from './fixtures.ts';
import { createImfAdapter } from './imf.ts';
import { createWorldBankAdapter, type GetJson } from './worldbank.ts';

export const FIXTURES_DIR = fileURLToPath(new URL('../../fixtures', import.meta.url));

/** Every registered source; `fixtures` swaps the network for recorded responses. */
export function allAdapters({ fixtures = false }: { fixtures?: boolean } = {}): SourceAdapter[] {
  const get: GetJson | undefined = fixtures ? fixtureGetter(FIXTURES_DIR) : undefined;
  return [
    createWorldBankAdapter(get),
    createImfAdapter('imf-weo', get),
    createImfAdapter('imf-fpp', get),
  ];
}

export { createImfAdapter, createWorldBankAdapter, fixtureGetter };
