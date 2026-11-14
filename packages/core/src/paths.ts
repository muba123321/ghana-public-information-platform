const PLACEHOLDER = 'https://gpip.invalid';

/** Backslash (browsers read it as "/"), whitespace and control characters never belong in our paths. */
const unsafeChar = (c: string) => {
  const code = c.charCodeAt(0);
  return c === '\\' || code <= 0x20 || code === 0x7f;
};

/**
 * A path on this site, or null. Parsed the way browsers parse it (backslashes count as slashes,
 * "//host" is another site), so a value accepted here can never send someone elsewhere.
 */
export function safeLocalPath(value: string): string | null {
  if (!value.startsWith('/') || [...value].some(unsafeChar)) return null;
  let url: URL;
  try {
    url = new URL(value, PLACEHOLDER);
  } catch {
    return null;
  }
  if (url.origin !== PLACEHOLDER) return null;
  return `${url.pathname}${url.search}`;
}
