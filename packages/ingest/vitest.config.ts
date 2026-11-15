import { defineConfig } from 'vitest/config';

// Each DB-backed test builds a fresh in-memory PGlite database (migrate + seed), which is slow
// when every package's suite runs in parallel under turbo.
export default defineConfig({
  test: { testTimeout: 30_000, hookTimeout: 60_000 },
});
