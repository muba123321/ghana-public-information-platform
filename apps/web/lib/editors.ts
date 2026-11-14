type Env = Record<string, string | undefined>;

/** Only GitHub accounts listed in ADMIN_GITHUB_LOGINS may review and publish. Empty list = nobody. */
export function isAllowedEditor(login: string | null | undefined, env: Env = process.env): boolean {
  if (!login) return false;
  const allowed = (env.ADMIN_GITHUB_LOGINS ?? '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  return allowed.includes(login.toLowerCase());
}

/**
 * The password-less test sign-in (local development and the e2e build only).
 * Throws if requested in a real production deployment, so a misconfiguration fails loudly.
 */
export function devLoginEnabled(env: Env = process.env): boolean {
  if (env.AUTH_DEV_LOGIN !== '1') return false;
  const realProduction =
    env.VERCEL === '1' || (env.NODE_ENV === 'production' && env.GPIP_E2E !== '1');
  if (realProduction) throw new Error('AUTH_DEV_LOGIN must never be set in production');
  return true;
}
