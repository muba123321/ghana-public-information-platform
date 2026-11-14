// Web-safe entry: connection, schema and read repositories only. Scripts use '@gpip/db/node'.

// Query operators for packages that build on @gpip/db, so the whole repo shares one drizzle-orm instance.
export { and, asc, count, desc, eq, inArray, ne, sql } from 'drizzle-orm';
export * from './client.ts';
export * from './repositories/administrations.ts';
export * from './repositories/commitments.ts';
export * from './repositories/indicators.ts';
export * from './repositories/institutions.ts';
export * from './schema/index.ts';
