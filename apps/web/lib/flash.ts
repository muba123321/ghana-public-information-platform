import { cookies } from 'next/headers';

/**
 * One-off messages after a form action ("Archived.", "Page must be between…"). They travel in a
 * short-lived HttpOnly cookie set by the server — never in the URL, where anyone could forge one.
 */
export type Flash = { kind: 'error' | 'note'; text: string };

const NAME = 'gpip_flash';

export const encodeFlash = (f: Flash) => JSON.stringify(f);

export function decodeFlash(raw: string | undefined): Flash | null {
  if (!raw) return null;
  try {
    const f = JSON.parse(raw) as Partial<Flash>;
    if (
      (f.kind === 'error' || f.kind === 'note') &&
      typeof f.text === 'string' &&
      f.text.length > 0 &&
      f.text.length <= 500
    ) {
      return { kind: f.kind, text: f.text };
    }
  } catch {
    // fall through
  }
  return null;
}

/** In a server action, before redirecting to `path`. */
export async function setFlash(path: string, flash: Flash): Promise<void> {
  (await cookies()).set(NAME, encodeFlash(flash), {
    httpOnly: true,
    sameSite: 'lax',
    path,
    maxAge: 15,
  });
}

/** In the page the action redirected to. */
export async function readFlash(): Promise<Flash | null> {
  return decodeFlash((await cookies()).get(NAME)?.value);
}
