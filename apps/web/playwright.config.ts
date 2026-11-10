import { fileURLToPath } from 'node:url';
import { defineConfig, devices } from '@playwright/test';

const PORT = 3100;
const DB = fileURLToPath(new URL('../../.data/e2e', import.meta.url));
const env = `DATABASE_URL=pglite:${DB}`;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  reporter: process.env.CI ? 'github' : 'list',
  use: { baseURL: `http://localhost:${PORT}` },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    // Fresh database for every run: migrate + seed, import recorded API responses, then serve.
    command: `rm -rf ${DB} && ${env} pnpm --filter @gpip/db db:seed && ${env} pnpm --filter @gpip/ingest ingest --fixtures && ${env} pnpm next start -p ${PORT}`,
    url: `http://localhost:${PORT}/history`,
    timeout: 120_000,
    reuseExistingServer: false,
  },
});
