import { z } from 'zod';
import { parseIsoDate } from './period.js';

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
