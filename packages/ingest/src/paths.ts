import { fileURLToPath } from 'node:url';

/** Repo-root `.data/archive` — the local document archive for CLIs (not imported by the web app). */
export const LOCAL_ARCHIVE_DIR = fileURLToPath(new URL('../../../.data/archive', import.meta.url));
