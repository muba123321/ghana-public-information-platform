import { closeSharedDb } from './db';

/**
 * With NEXT_MANUAL_SIG_HANDLE=true, Next.js leaves SIGINT/SIGTERM to us. Its own handler exits
 * without waiting for async work, and an on-disk PGlite stopped mid-checkpoint cannot be reopened —
 * so we close the database first, then exit with the conventional signal code.
 */
export function registerShutdown(): void {
  for (const [signal, code] of [
    ['SIGINT', 130],
    ['SIGTERM', 143],
  ] as const) {
    process.once(signal, () => {
      const force = setTimeout(() => process.exit(code), 8_000);
      force.unref();
      void closeSharedDb()
        .catch(() => undefined)
        .finally(() => process.exit(code));
    });
  }
}
