import NextAuth, { type NextAuthConfig } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import GitHub from 'next-auth/providers/github';
import { devLoginEnabled, isAllowedEditor } from './lib/editors';

type WithLogin = { login?: string };

const providers: NextAuthConfig['providers'] = [GitHub];
if (devLoginEnabled()) {
  // Local development and e2e only (guarded in devLoginEnabled): sign in as an allow-listed login.
  providers.push(
    Credentials({
      id: 'dev',
      name: 'Test editor',
      credentials: { login: { label: 'GitHub login', type: 'text' } },
      authorize: async (c) => {
        const login = String(c?.login ?? '');
        return isAllowedEditor(login) ? { id: login, name: login, login } : null;
      },
    }),
  );
}

const loginOf = (provider: string | undefined, profile: unknown, user: unknown) =>
  provider === 'github'
    ? (profile as WithLogin | undefined)?.login
    : (user as WithLogin | undefined)?.login;

export const { handlers, auth, signOut } = NextAuth({
  trustHost: true,
  session: { strategy: 'jwt', maxAge: 60 * 60 * 12 },
  providers,
  callbacks: {
    signIn: ({ account, profile, user }) =>
      isAllowedEditor(loginOf(account?.provider, profile, user)),
    jwt: ({ token, account, profile, user }) => {
      if (account) token.login = loginOf(account.provider, profile, user);
      return token;
    },
    session: ({ session, token }) =>
      Object.assign(session, { login: token.login as string | undefined }),
  },
});
