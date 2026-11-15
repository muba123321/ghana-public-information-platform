/** Runs once when the server starts (Next.js instrumentation hook). */
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs' && process.env.NEXT_MANUAL_SIG_HANDLE === 'true') {
    const { registerShutdown } = await import('./lib/shutdown');
    registerShutdown();
  }
}
