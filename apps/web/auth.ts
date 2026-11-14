import NextAuth, { type NextAuthConfig } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import GitHub from 'next-auth/providers/github';
import { devLoginEnabled, isAllowedEditor } from './lib/editors';

type WithLogin = { login?: string };
type Account = { provider?: string; providerAccountId?: string } | null | undefined;

const providers: NextAuthConfig['providers'] = [GitHub];
if (devLoginEnabled()) {
  // Local development and e2e only (guarded in devLoginEnabled): sign in as an allow-listed test id.
  providers.push(
    Credentials({
      id: 'dev',
      name: 'Test editor',
      credentials: { editorId: { label: 'Test editor id', type: 'text' } },
      authorize: async (c) => {
        const id = String(c?.editorId ?? '');
        return isAllowedEditor(id) ? { id, name: id, login: id } : null;
      },
    }),
  );
}

/**
 * Who is signing in, for authorisation: GitHub's permanent numeric account id (never the
 * renameable username), or the test provider's id.
 */
const editorIdOf = (account: Account, user: unknown) =>
  account?.provider === 'github'
    ? account.providerAccountId
    : (user as { id?: string } | undefined)?.id;

/** Display name only — never used to decide access. */
const loginOf = (account: Account, profile: unknown, user: unknown) =>
  account?.provider === 'github'
    ? (profile as WithLogin | undefined)?.login
    : (user as WithLogin | undefined)?.login;

export const { handlers, auth, signOut } = NextAuth({
  trustHost: true,
  session: { strategy: 'jwt', maxAge: 60 * 60 * 12 },
  providers,
  callbacks: {
    signIn: ({ account, user }) => isAllowedEditor(editorIdOf(account, user)),
    jwt: ({ token, account, profile, user }) => {
      if (account) {
        token.editorId = editorIdOf(account, user);
        token.login = loginOf(account, profile, user);
      }
      return token;
    },
    session: ({ session, token }) =>
      Object.assign(session, {
        editorId: token.editorId as string | undefined,
        login: token.login as string | undefined,
      }),
  },
});
