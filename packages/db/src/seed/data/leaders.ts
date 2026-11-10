import type { LeaderSeed } from '@gpip/core';

const HS = 'wiki-heads-of-state';
const VP = 'wiki-vice-president';
const PM = 'wiki-prime-minister';

type Row = [
  admin: string,
  person: string,
  role: LeaderSeed['role'],
  start: string,
  end: string | null,
  label?: string,
];

// Leader periods are clipped to their administration's tenure.
const rows: Row[] = [
  ['1957-dominion', 'elizabeth-ii', 'head_of_state', '1957-03-06', null, 'Queen of Ghana'],
  ['1957-dominion', 'kwame-nkrumah', 'head_of_government', '1957-03-06', null, 'Prime Minister'],
  ['1960-first-republic', 'kwame-nkrumah', 'head_of_state', '1960-07-01', null, 'President'],
  [
    '1966-nlc',
    'joseph-arthur-ankrah',
    'head_of_state',
    '1966-02-24',
    '1969-04-02',
    'Chairman, National Liberation Council',
  ],
  [
    '1966-nlc',
    'akwasi-afrifa',
    'head_of_state',
    '1969-04-02',
    '1969-09-03',
    'Chairman, National Liberation Council',
  ],
  [
    '1966-nlc',
    'akwasi-afrifa',
    'head_of_state',
    '1969-09-03',
    null,
    'Chairman, Presidential Commission',
  ],
  [
    '1969-second-republic',
    'akwasi-afrifa',
    'head_of_state',
    '1969-10-01',
    '1970-08-07',
    'Chairman, Presidential Commission',
  ],
  [
    '1969-second-republic',
    'nii-amaa-ollennu',
    'head_of_state',
    '1970-08-07',
    '1970-08-31',
    'Acting President',
  ],
  ['1969-second-republic', 'edward-akufo-addo', 'head_of_state', '1970-08-31', null, 'President'],
  [
    '1969-second-republic',
    'kofi-abrefa-busia',
    'head_of_government',
    '1969-10-01',
    null,
    'Prime Minister',
  ],
  [
    '1972-nrc',
    'ignatius-kutu-acheampong',
    'head_of_state',
    '1972-01-13',
    null,
    'Chairman, National Redemption Council',
  ],
  [
    '1975-smc-i',
    'ignatius-kutu-acheampong',
    'head_of_state',
    '1975-10-09',
    null,
    'Chairman, Supreme Military Council',
  ],
  [
    '1978-smc-ii',
    'fred-akuffo',
    'head_of_state',
    '1978-07-05',
    null,
    'Chairman, Supreme Military Council',
  ],
  [
    '1979-afrc',
    'jerry-john-rawlings',
    'head_of_state',
    '1979-06-04',
    null,
    'Chairman, Armed Forces Revolutionary Council',
  ],
  ['1979-third-republic', 'hilla-limann', 'head_of_state', '1979-09-24', null, 'President'],
  ['1979-third-republic', 'joseph-de-graft-johnson', 'vice_president', '1979-09-24', null],
  [
    '1981-pndc',
    'jerry-john-rawlings',
    'head_of_state',
    '1981-12-31',
    null,
    'Chairman, Provisional National Defence Council',
  ],
  ['1993-rawlings-i', 'jerry-john-rawlings', 'head_of_state', '1993-01-07', null, 'President'],
  ['1993-rawlings-i', 'kow-nkensen-arkaah', 'vice_president', '1993-01-07', null],
  ['1997-rawlings-ii', 'jerry-john-rawlings', 'head_of_state', '1997-01-07', null, 'President'],
  ['1997-rawlings-ii', 'john-evans-atta-mills', 'vice_president', '1997-01-07', null],
  ['2001-kufuor-i', 'john-agyekum-kufuor', 'head_of_state', '2001-01-07', null, 'President'],
  ['2001-kufuor-i', 'aliu-mahama', 'vice_president', '2001-01-07', null],
  ['2005-kufuor-ii', 'john-agyekum-kufuor', 'head_of_state', '2005-01-07', null, 'President'],
  ['2005-kufuor-ii', 'aliu-mahama', 'vice_president', '2005-01-07', null],
  [
    '2009-mills-mahama',
    'john-evans-atta-mills',
    'head_of_state',
    '2009-01-07',
    '2012-07-24',
    'President',
  ],
  ['2009-mills-mahama', 'john-dramani-mahama', 'head_of_state', '2012-07-24', null, 'President'],
  ['2009-mills-mahama', 'john-dramani-mahama', 'vice_president', '2009-01-07', '2012-07-24'],
  ['2009-mills-mahama', 'kwesi-amissah-arthur', 'vice_president', '2012-08-06', null],
  ['2013-mahama-i', 'john-dramani-mahama', 'head_of_state', '2013-01-07', null, 'President'],
  ['2013-mahama-i', 'kwesi-amissah-arthur', 'vice_president', '2013-01-07', null],
  ['2017-akufo-addo-i', 'nana-akufo-addo', 'head_of_state', '2017-01-07', null, 'President'],
  ['2017-akufo-addo-i', 'mahamudu-bawumia', 'vice_president', '2017-01-07', null],
  ['2021-akufo-addo-ii', 'nana-akufo-addo', 'head_of_state', '2021-01-07', null, 'President'],
  ['2021-akufo-addo-ii', 'mahamudu-bawumia', 'vice_president', '2021-01-07', null],
  ['2025-mahama-ii', 'john-dramani-mahama', 'head_of_state', '2025-01-07', null, 'President'],
  ['2025-mahama-ii', 'jane-naana-opoku-agyemang', 'vice_president', '2025-01-07', null],
];

const sourceFor = (role: LeaderSeed['role']) =>
  role === 'vice_president' ? VP : role === 'head_of_government' ? PM : HS;

/** `endDate: null` means "until the end of the administration" (or incumbent). */
export const leaderSeeds: LeaderSeed[] = rows.map(
  ([administrationSlug, personSlug, role, startDate, endDate, label]) => ({
    administrationSlug,
    personSlug,
    role,
    startDate,
    endDate,
    sourceKey: sourceFor(role),
    ...(label ? { label } : {}),
  }),
);
