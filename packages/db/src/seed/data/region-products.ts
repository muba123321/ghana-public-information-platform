/**
 * Each region's main farm products and animals, from the Ministry of Food and Agriculture's
 * "Agriculture in Ghana: Facts and Figures". Reviewed in the pull request (owner merge = approval).
 */
export interface RegionProductSeed {
  regionSlug: string;
  product: string;
  kind: 'crop' | 'livestock' | 'fishing';
  rank: 'main' | 'notable';
  sourceKey: string;
}

const KIND: Record<string, RegionProductSeed['kind']> = {
  cattle: 'livestock',
  'goats-and-sheep': 'livestock',
  fishing: 'fishing',
};
const MAIN: Record<string, string[]> = {
  'upper-west': ['shea', 'cattle', 'goats-and-sheep'],
  'upper-east': ['rice', 'cattle', 'goats-and-sheep'],
  'north-east': ['shea', 'cattle'],
  savannah: ['shea', 'yam', 'cattle'],
  northern: ['yam', 'rice', 'shea', 'cattle'],
  oti: ['yam', 'fishing'],
  bono: ['cashew', 'cocoa'],
  'bono-east': ['yam', 'cashew', 'maize', 'fishing'],
  ahafo: ['cocoa', 'plantain'],
  ashanti: ['cocoa', 'plantain', 'maize'],
  'western-north': ['cocoa'],
  eastern: ['cocoa', 'oil-palm', 'maize', 'pineapple'],
  volta: ['rice', 'fishing'],
  'greater-accra': ['fishing', 'pineapple'],
  central: ['pineapple', 'oil-palm', 'fishing'],
  western: ['cocoa', 'oil-palm', 'fishing'],
};

export const regionProductSeeds: RegionProductSeed[] = Object.entries(MAIN).flatMap(
  ([regionSlug, products]) =>
    products.map((product) => ({
      regionSlug,
      product,
      kind: KIND[product] ?? 'crop',
      rank: 'main' as const,
      sourceKey: 'mofa-facts-figures',
    })),
);
