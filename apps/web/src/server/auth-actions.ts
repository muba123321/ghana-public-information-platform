'use server';
import 'server-only';

import { signOut } from '@/server/auth';

export async function signOutAction() {
  await signOut({ redirectTo: '/' });
}
