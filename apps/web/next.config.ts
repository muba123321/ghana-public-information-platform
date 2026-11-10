import type { NextConfig } from 'next';

const config: NextConfig = {
  // Workspace packages ship TypeScript source.
  transpilePackages: ['@gpip/core', '@gpip/db'],
  // PGlite loads its WASM/data files from its own package directory at runtime.
  serverExternalPackages: ['@electric-sql/pglite'],
  poweredByHeader: false,
};

export default config;
