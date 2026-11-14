type Env = Record<string, string | undefined>;

/**
 * Only accounts listed in ADMIN_GITHUB_IDS may review and publish. These are GitHub's permanent
 * numeric account ids — usernames can be renamed and re-registered, so they never grant access.
 * Empty list = nobody.
 */
export function isAllowedEditor(
  accountId: string | null | undefined,
  env: Env = process.env,
): boolean {
  if (!accountId) return false;
  const allowed = (env.ADMIN_GITHUB_IDS ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  return allowed.includes(accountId.trim());
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
