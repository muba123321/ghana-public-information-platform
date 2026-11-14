import type { NextConfig } from 'next';

const config: NextConfig = {
  // Workspace packages ship TypeScript source.
  transpilePackages: ['@gpip/core', '@gpip/db', '@gpip/ingest'],
  // PGlite loads its WASM/data files from its own package directory at runtime.
  serverExternalPackages: ['@electric-sql/pglite', '@aws-sdk/client-s3'],
  experimental: { serverActions: { bodySizeLimit: '40mb' } },
  poweredByHeader: false,
};

export default config;
