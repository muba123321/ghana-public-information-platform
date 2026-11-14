import { describe, expect, it } from 'vitest';
import { devLoginEnabled, isAllowedEditor } from './editors';

describe('isAllowedEditor', () => {
  const env = { ADMIN_GITHUB_LOGINS: 'muba123321, Another-Editor' };

  it('allows listed GitHub logins, case-insensitively', () => {
    expect(isAllowedEditor('muba123321', env)).toBe(true);
    expect(isAllowedEditor('another-editor', env)).toBe(true);
  });

  it('refuses everyone else, including when no list is set', () => {
    expect(isAllowedEditor('stranger', env)).toBe(false);
    expect(isAllowedEditor(undefined, env)).toBe(false);
    expect(isAllowedEditor('muba123321', {})).toBe(false);
    expect(isAllowedEditor('', { ADMIN_GITHUB_LOGINS: '' })).toBe(false);
  });
});

describe('devLoginEnabled (test-only sign-in)', () => {
  it('is off unless explicitly requested', () => {
    expect(devLoginEnabled({ NODE_ENV: 'development' })).toBe(false);
  });

  it('is on for local development and the e2e build when requested', () => {
    expect(devLoginEnabled({ NODE_ENV: 'development', AUTH_DEV_LOGIN: '1' })).toBe(true);
    expect(devLoginEnabled({ NODE_ENV: 'production', AUTH_DEV_LOGIN: '1', GPIP_E2E: '1' })).toBe(
      true,
    );
  });

  it('can never be enabled in a real production deployment', () => {
    expect(() => devLoginEnabled({ NODE_ENV: 'production', AUTH_DEV_LOGIN: '1' })).toThrow(
      /production/,
    );
    expect(() =>
      devLoginEnabled({ NODE_ENV: 'production', AUTH_DEV_LOGIN: '1', GPIP_E2E: '1', VERCEL: '1' }),
    ).toThrow(/production/);
  });
});
