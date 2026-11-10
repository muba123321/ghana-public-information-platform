import { z } from 'zod';
import { parseIsoDate } from './period.ts';

export const IsoDateSchema = z.string().refine(
  (s) => {
    try {
      parseIsoDate(s);
      return true;
    } catch {
      return false;
    }
  },
  { message: 'must be a real YYYY-MM-DD date' },
);

const slug = z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/);

const dateRange = { startDate: IsoDateSchema, endDate: IsoDateSchema.nullable() };
const endAfterStart = (r: { startDate: string; endDate: string | null }) =>
  r.endDate === null || r.endDate > r.startDate;
const endAfterStartError = { message: 'endDate must be after startDate', path: ['endDate'] };

export const AdministrationKindSchema = z.enum(['civilian', 'military', 'transitional']);
export const LeaderRoleSchema = z.enum(['head_of_state', 'head_of_government', 'vice_president']);
export type AdministrationKind = z.infer<typeof AdministrationKindSchema>;
export type LeaderRole = z.infer<typeof LeaderRoleSchema>;

export const SourceSeedSchema = z.object({
  key: slug,
  publisher: z.string().min(1),
  title: z.string().min(1),
  url: z.url({ protocol: /^https$/ }),
  sourceType: z.enum([
    'official_website',
    'statute',
    'gazette',
    'report',
    'dataset',
    'manifesto',
    'budget_statement',
    'development_plan',
    'reference_work',
  ]),
  retrievedOn: IsoDateSchema,
  licence: z.string().nullable(),
});

export const PartySeedSchema = z.object({
  slug,
  name: z.string().min(1),
  abbreviation: z.string().min(1),
});
export const PersonSeedSchema = z.object({ slug, fullName: z.string().min(1) });
export const SectorSeedSchema = z.object({ slug, name: z.string().min(1) });

export const AdministrationSeedSchema = z
  .object({
    slug,
    name: z.string().min(1),
    kind: AdministrationKindSchema,
    partySlug: slug.nullable(),
    sourceKey: slug,
    notes: z.string().optional(),
    ...dateRange,
  })
  .refine(endAfterStart, endAfterStartError);

export const LeaderSeedSchema = z
  .object({
    administrationSlug: slug,
    personSlug: slug,
    role: LeaderRoleSchema,
    label: z.string().optional(),
    sourceKey: slug,
    ...dateRange,
  })
  .refine(endAfterStart, endAfterStartError);

export type SourceSeed = z.infer<typeof SourceSeedSchema>;
export type PartySeed = z.infer<typeof PartySeedSchema>;
export type PersonSeed = z.infer<typeof PersonSeedSchema>;
export type SectorSeed = z.infer<typeof SectorSeedSchema>;
export type AdministrationSeed = z.infer<typeof AdministrationSeedSchema>;
export type LeaderSeed = z.infer<typeof LeaderSeedSchema>;

export const EstimateTypeSchema = z.enum(['reported', 'modelled', 'projected']);

export const IndicatorSeedSchema = z.object({
  code: slug,
  name: z.string().min(1),
  definition: z.string().min(1),
  unit: z.string().min(1),
  frequency: z.enum(['annual', 'quarterly', 'monthly']),
  sectorSlug: slug,
  sourceKey: slug,
  seriesCode: z.string().min(1),
  estimateType: EstimateTypeSchema,
  methodology: z.string().optional(),
});

/** Words that judge rather than describe — not allowed in editorial titles. */
const EVALUATIVE = /\b(success|fail|achiev|disaster|boom|triumph|crisis-hit|collapse)\w*/i;

export const ContextEventSeedSchema = z.object({
  date: IsoDateSchema,
  title: z
    .string()
    .min(1)
    .max(90)
    .refine((t) => !EVALUATIVE.test(t), { message: 'title must describe, not judge' }),
  kind: z.enum(['international', 'methodology', 'domestic', 'institutional']),
  sourceKey: slug,
});

export type IndicatorSeed = z.infer<typeof IndicatorSeedSchema>;
export type ContextEventSeed = z.infer<typeof ContextEventSeedSchema>;
