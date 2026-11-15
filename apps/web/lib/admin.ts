import 'server-only';
import { resolve } from 'node:path';
import { storeFromEnv } from '@gpip/ingest/web';
import { redirect } from 'next/navigation';
import { auth } from '../auth';
import { isAllowedEditor } from './editors';

/**
 * The signed-in editor (GitHub login, for display and audit), or null. Authorisation re-checks the
 * permanent account id against the allow-list on every call, so removing an id revokes access.
 */
export async function currentEditor(): Promise<string | null> {
  const session = (await auth()) as { editorId?: string; login?: string } | null;
  if (!session?.editorId || !isAllowedEditor(session.editorId)) return null;
  return session.login ?? session.editorId;
}

/**
 * Every admin page and server action calls this first — a layout check alone does not protect
 * server actions, which can be invoked directly.
 */
export async function requireEditor(): Promise<string> {
  const login = await currentEditor();
  if (!login) redirect('/api/auth/signin?callbackUrl=%2Fadmin');
  return login;
}

/** The document archive: R2 in production, repo-root .data/archive locally (next runs in apps/web). */
export const archiveStore = () =>
  storeFromEnv(process.env, resolve(process.cwd(), '../../.data/archive'));
