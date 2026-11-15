import type { AdministrationKind } from '@gpip/core';
import type { AdministrationLeader } from '@gpip/db';

/** "Civilian government", shown on profiles and in the directory. */
export const ADMINISTRATION_KIND_LABELS: Record<AdministrationKind, string> = {
  civilian: 'Civilian government',
  military: 'Military government',
  transitional: 'Transitional government',
};

/** Lower-case form used inside sentences ("1957–1966, civilian government"). */
export const ADMINISTRATION_KIND_WORDS: Record<AdministrationKind, string> = {
  civilian: 'civilian government',
  military: 'military government',
  transitional: 'transitional government',
};

export const LEADER_ROLE_LABELS: Record<AdministrationLeader['role'], string> = {
  head_of_state: 'Head of state',
  head_of_government: 'Head of government',
  vice_president: 'Vice-President',
};

/** The directory's filter links. */
export const ADMINISTRATION_FILTERS = [
  { label: 'All', kind: undefined },
  { label: 'Civilian', kind: 'civilian' },
  { label: 'Military', kind: 'military' },
] as const;

/** Headings for the commitment groups on a government's profile. */
export const COMMITMENT_GROUP_HEADINGS = {
  originated: 'Made by this government',
  inherited: 'Inherited from earlier governments',
  handedOver: 'Handed on to the next government',
} as const;
