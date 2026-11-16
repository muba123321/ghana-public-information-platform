/**
 * Regional figures from The DHS Program's public indicator API (Demographic and Health Surveys and
 * Malaria Indicator Surveys, Ghana). Each figure stays with the geography the survey describes: a
 * "Brong-Ahafo" figure belongs to the former Brong-Ahafo Region even in a 2019 survey.
 */

export const DHS_URL =
  'https://api.dhsprogram.com/rest/dhs/data?countryIds=GH&breakdown=subnational&f=json&perpage=5000&indicatorIds=';

/** DHS indicator id → our regional indicator code. */
export const DHS_INDICATORS: Record<string, string> = {
  RH_DELA_C_SKP: 'skilled-birth-attendance',
  CH_VACC_C_BAS: 'child-basic-vaccination',
  HC_ELEC_H_ELC: 'households-electricity',
  WS_SRCE_H_IMP: 'households-improved-water',
};

/** Every region name the surveys use, by meaning. 'skip' = a total of several regions. */
const REGION_LABELS: Record<string, string> = {
  Ashanti: 'ashanti',
  Central: 'central',
  Eastern: 'eastern',
  'Greater Accra': 'greater-accra',
  '..Upper East': 'upper-east',
  '..Upper West': 'upper-west',
  // Regions as they were before the 2019 split (the DHS labels them "pre 2022").
  'Brong-Ahafo': 'brong-ahafo',
  '..Northern (pre 2022)': 'northern-former',
  'Volta (pre 2022)': 'volta-former',
  'Western (pre 2022)': 'western-former',
  // Regions created or redrawn in 2019.
  '..Ahafo': 'ahafo',
  '..Bono': 'bono',
  '..Bono East': 'bono-east',
  '..Oti': 'oti',
  '..Western North': 'western-north',
  '....Savannah': 'savannah',
  '....Northeast': 'north-east',
  '....Northern(post 2022)': 'northern',
  '..Volta (post 2022)': 'volta',
  '..Western (post 2022)': 'western',
  'Northern, Upper West, Upper East': 'skip',
};

/** Our region slug for a DHS region name; 'skip' for multi-region totals; null when unknown. */
export function mapDhsRegion(label: string): string | null {
  return REGION_LABELS[label] ?? null;
}

interface DhsRow {
  IndicatorId: string;
  SurveyYear: number;
  SurveyId: string;
  CharacteristicLabel: string;
  Value: number | null;
  IsPreferred: number;
}

export interface RegionalFigure {
  code: string;
  regionSlug: string;
  year: number;
  value: number | null;
  surveyId: string;
}

/** Turns an API response into figures; unknown region names are reported, never guessed. */
export function parseDhsRegional(json: { Data?: DhsRow[] }): {
  rows: RegionalFigure[];
  errors: string[];
} {
  const errors: string[] = [];
  const chosen = new Map<string, DhsRow>();
  for (const r of json.Data ?? []) {
    const code = DHS_INDICATORS[r.IndicatorId];
    if (!code) continue;
    const slug = mapDhsRegion(r.CharacteristicLabel);
    if (slug === null) {
      errors.push(`Unknown DHS region "${r.CharacteristicLabel}" in ${r.SurveyId}`);
      continue;
    }
    if (slug === 'skip') continue;
    // Several breakdowns of one figure: keep the one DHS marks as preferred.
    const key = `${code}|${slug}|${r.SurveyId}`;
    const seen = chosen.get(key);
    if (!seen || (r.IsPreferred && !seen.IsPreferred)) chosen.set(key, r);
  }
  const rows = [...chosen.entries()].map(([key, r]) => {
    const [code, regionSlug] = key.split('|') as [string, string];
    return { code, regionSlug, year: r.SurveyYear, value: r.Value, surveyId: r.SurveyId };
  });
  return { rows, errors };
}
