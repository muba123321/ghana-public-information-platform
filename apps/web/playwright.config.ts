import { fileURLToPath } from 'node:url';
import { defineConfig, devices } from '@playwright/test';

const PORT = 3100;
const DB = fileURLToPath(new URL('../../.data/e2e', import.meta.url));
const ARCHIVE = fileURLToPath(new URL('../../.data/e2e-archive', import.meta.url));
const env = `DATABASE_URL=pglite:${DB} GPIP_ARCHIVE_DIR=${ARCHIVE}`;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  reporter: process.env.CI ? 'github' : 'list',
  use: { baseURL: `http://localhost:${PORT}` },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    // Fresh database for every run: migrate + seed, import recorded API responses, then serve.
    command: `rm -rf ${DB} ${ARCHIVE} && ${env} pnpm --filter @gpip/db db:seed && ${env} pnpm --filter @gpip/ingest ingest --fixtures && ${env} pnpm exec tsx e2e/fixtures.ts && ${env} pnpm next start -p ${PORT}`,
    // Test-only sign-in: allowed in this production build solely because GPIP_E2E=1 (see lib/editors.ts).
    env: {
      AUTH_SECRET: 'e2e-only-secret-not-used-anywhere-else-0123456789',
      AUTH_DEV_LOGIN: '1',
      GPIP_E2E: '1',
      ADMIN_GITHUB_LOGINS: 'e2e-editor',
      AUTH_GITHUB_ID: 'e2e',
      AUTH_GITHUB_SECRET: 'e2e',
    },
    url: `http://localhost:${PORT}/history`,
    timeout: 120_000,
    reuseExistingServer: false,
  },
});
