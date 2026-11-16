import type { RegionSeed } from '@gpip/core';

const SPLIT = '2019-02-01'; // C.I. 112–117 made on 1 February 2019

/**
 * Ghana's regions in our records, north to south. Regions that existed before our earliest regional
 * figures (1988) have no validFrom — we do not guess founding dates. The four regions split in 2019
 * are kept as former regions so earlier figures stay attached to the geography they describe.
 */
const current: RegionSeed[] = (
  [
    ['upper-west', 'Upper West', 'Wa', null],
    ['upper-east', 'Upper East', 'Bolgatanga', null],
    ['north-east', 'North East', 'Nalerigu', SPLIT],
    ['savannah', 'Savannah', 'Damongo', SPLIT],
    ['northern', 'Northern', 'Tamale', SPLIT],
    ['oti', 'Oti', 'Dambai', SPLIT],
    ['bono', 'Bono', 'Sunyani', SPLIT],
    ['bono-east', 'Bono East', 'Techiman', SPLIT],
    ['ahafo', 'Ahafo', 'Goaso', SPLIT],
    ['ashanti', 'Ashanti', 'Kumasi', null],
    ['western-north', 'Western North', 'Sefwi Wiawso', SPLIT],
    ['eastern', 'Eastern', 'Koforidua', null],
    ['volta', 'Volta', 'Ho', SPLIT],
    ['greater-accra', 'Greater Accra', 'Accra', null],
    ['central', 'Central', 'Cape Coast', null],
    ['western', 'Western', 'Sekondi-Takoradi', SPLIT],
  ] as const
).map(([slug, name, capital, validFrom], i) => ({
  slug,
  name,
  capital,
  validFrom,
  validTo: null,
  displayOrder: i + 1,
  sourceKey: 'gss-phc-2021',
}));

const former: RegionSeed[] = (
  [
    ['northern-former', 'Northern Region (before 2019)', 'Tamale'],
    ['brong-ahafo', 'Brong-Ahafo Region', 'Sunyani'],
    ['volta-former', 'Volta Region (before 2019)', 'Ho'],
    ['western-former', 'Western Region (before 2019)', 'Sekondi-Takoradi'],
  ] as const
).map(([slug, name, capital], i) => ({
  slug,
  name,
  capital,
  validFrom: null,
  validTo: SPLIT,
  displayOrder: 101 + i,
  sourceKey: 'gss-phc-2010',
}));

export const regionSeeds: RegionSeed[] = [...current, ...former];

/** The 2019 split: each current region and the former region it came from, with its instrument. */
export const regionLineageSeeds = (
  [
    ['northern-former', 'northern', 'ci-2019-115'],
    ['northern-former', 'savannah', 'ci-2019-115'],
    ['northern-former', 'north-east', 'ci-2019-116'],
    ['brong-ahafo', 'bono', 'ci-2019-113'],
    ['brong-ahafo', 'bono-east', 'ci-2019-113'],
    ['brong-ahafo', 'ahafo', 'ci-2019-114'],
    ['volta-former', 'volta', 'ci-2019-112'],
    ['volta-former', 'oti', 'ci-2019-112'],
    ['western-former', 'western', 'ci-2019-117'],
    ['western-former', 'western-north', 'ci-2019-117'],
  ] as const
).map(([fromSlug, toSlug, sourceKey]) => ({ fromSlug, toSlug, effectiveOn: SPLIT, sourceKey }));
