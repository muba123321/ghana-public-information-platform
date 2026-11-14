import type { InstitutionSeed } from '@gpip/core';

const S = 'ei-2025-1';
const FROM = '2025-01-09'; // Civil Service (Ministries) Instrument, 2025 (E.I. 1), commenced 9 January 2025

/**
 * Sector ministries in force under E.I. 1 (names exactly as listed). Earlier names and
 * reorganisations are added only once their dates are sourced — never guessed (issue: data).
 */
export const institutionSeeds: InstitutionSeed[] = [
  {
    slug: 'ministry-of-finance',
    kind: 'ministry',
    name: 'Ministry of Finance',
    sectorSlug: 'economy',
    validFrom: FROM,
    sourceKey: S,
  },
  {
    slug: 'ministry-of-trade-agribusiness-industry',
    kind: 'ministry',
    name: 'Ministry of Trade, Agribusiness and Industry',
    sectorSlug: 'economy',
    validFrom: FROM,
    sourceKey: S,
  },
  {
    slug: 'ministry-of-food-and-agriculture',
    kind: 'ministry',
    name: 'Ministry of Food and Agriculture',
    sectorSlug: 'agriculture',
    validFrom: FROM,
    sourceKey: S,
  },
  {
    slug: 'ministry-of-fisheries-and-aquaculture',
    kind: 'ministry',
    name: 'Ministry of Fisheries and Aquaculture',
    sectorSlug: 'agriculture',
    validFrom: FROM,
    sourceKey: S,
  },
  {
    slug: 'ministry-of-education',
    kind: 'ministry',
    name: 'Ministry of Education',
    sectorSlug: 'education',
    validFrom: FROM,
    sourceKey: S,
  },
  {
    slug: 'ministry-of-health',
    kind: 'ministry',
    name: 'Ministry of Health',
    sectorSlug: 'health',
    validFrom: FROM,
    sourceKey: S,
  },
  {
    slug: 'ministry-of-roads-and-highways',
    kind: 'ministry',
    name: 'Ministry of Roads and Highways',
    sectorSlug: 'infrastructure',
    validFrom: FROM,
    sourceKey: S,
  },
  {
    slug: 'ministry-of-transport',
    kind: 'ministry',
    name: 'Ministry of Transport',
    sectorSlug: 'infrastructure',
    validFrom: FROM,
    sourceKey: S,
  },
  {
    slug: 'ministry-of-energy',
    kind: 'ministry',
    name: 'Ministry of Energy and Green Transition',
    sectorSlug: 'infrastructure',
    validFrom: FROM,
    sourceKey: S,
  },
  {
    slug: 'ministry-of-works-housing-water-resources',
    kind: 'ministry',
    name: 'Ministry of Works, Housing and Water Resources',
    sectorSlug: 'infrastructure',
    validFrom: FROM,
    sourceKey: S,
  },
  {
    slug: 'ministry-of-gender-children-social-protection',
    kind: 'ministry',
    name: 'Ministry of Gender, Children and Social Protection',
    sectorSlug: 'social-development',
    validFrom: FROM,
    sourceKey: S,
  },
  {
    slug: 'ministry-of-labour-jobs-employment',
    kind: 'ministry',
    name: 'Ministry of Labour, Jobs and Employment',
    sectorSlug: 'social-development',
    validFrom: FROM,
    sourceKey: S,
  },
  {
    slug: 'ministry-of-youth-development-empowerment',
    kind: 'ministry',
    name: 'Ministry of Youth Development and Empowerment',
    sectorSlug: 'social-development',
    validFrom: FROM,
    sourceKey: S,
  },
];
