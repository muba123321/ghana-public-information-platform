import type { ContextEventSeed } from '@gpip/core';

/** Dated, sourced facts shown on charts — they describe, never explain or judge. */
export const contextEventSeeds: ContextEventSeed[] = [
  {
    date: '2007-07-01',
    title: 'Cedi redenominated: 10,000 old cedis became 1 Ghana cedi',
    kind: 'methodology',
    sourceKey: 'pwc-cedi-redenomination',
  },
  {
    date: '2008-09-15',
    title: 'Lehman Brothers files for bankruptcy during the global financial crisis',
    kind: 'international',
    sourceKey: 'fed-great-recession',
  },
  {
    date: '2010-11-03',
    title: 'GDP re-based to 2006 prices by the Ghana Statistical Service',
    kind: 'methodology',
    sourceKey: 'gss-rebasing-2010',
  },
  {
    date: '2015-04-03',
    title: 'IMF Extended Credit Facility programme approved',
    kind: 'domestic',
    sourceKey: 'imf-ecf-2015',
  },
  {
    date: '2018-09-28',
    title: 'GDP re-based to 2013 prices by the Ghana Statistical Service',
    kind: 'methodology',
    sourceKey: 'gss-rebasing-2018',
  },
  {
    date: '2020-03-11',
    title: 'COVID-19 declared a pandemic by the WHO',
    kind: 'international',
    sourceKey: 'who-covid-pandemic',
  },
  {
    date: '2022-12-19',
    title: 'Payments on most external debt suspended pending restructuring',
    kind: 'domestic',
    sourceKey: 'mof-debt-suspension-2022',
  },
  {
    date: '2023-05-17',
    title: 'IMF Extended Credit Facility programme approved',
    kind: 'domestic',
    sourceKey: 'imf-ecf-2023',
  },
];
