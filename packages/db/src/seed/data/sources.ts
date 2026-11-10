import type { SourceSeed } from '@gpip/core';

// v1 uses reputable reference works; replace with official Presidency/Parliament records as they
// are located (tracked as a data issue). Every date in this seed was checked against these pages.
export const sourceSeeds: SourceSeed[] = [
  {
    key: 'wiki-heads-of-state',
    publisher: 'Wikipedia',
    title: 'List of heads of state of Ghana',
    url: 'https://en.wikipedia.org/wiki/List_of_heads_of_state_of_Ghana',
    sourceType: 'reference_work',
    retrievedOn: '2026-11-09',
    licence: 'CC BY-SA 4.0',
  },
  {
    key: 'wiki-vice-president',
    publisher: 'Wikipedia',
    title: 'Vice President of Ghana',
    url: 'https://en.wikipedia.org/wiki/Vice_President_of_Ghana',
    sourceType: 'reference_work',
    retrievedOn: '2026-11-09',
    licence: 'CC BY-SA 4.0',
  },
  {
    key: 'wiki-prime-minister',
    publisher: 'Wikipedia',
    title: 'Prime Minister of Ghana',
    url: 'https://en.wikipedia.org/wiki/Prime_Minister_of_Ghana',
    sourceType: 'reference_work',
    retrievedOn: '2026-11-09',
    licence: 'CC BY-SA 4.0',
  },
];
