import { describe, expect, it } from 'vitest';
import { devLoginEnabled, isAllowedEditor } from './editors';

describe('isAllowedEditor (by permanent account id, not the renameable username)', () => {
  const env = { ADMIN_GITHUB_IDS: '105753631, 42' };

  it('allows listed account ids', () => {
    expect(isAllowedEditor('105753631', env)).toBe(true);
    expect(isAllowedEditor('42', env)).toBe(true);
  });

  it('refuses everyone else, including a username that matches someone listed', () => {
    expect(isAllowedEditor('muba123321', env)).toBe(false);
    expect(isAllowedEditor('7', env)).toBe(false);
    expect(isAllowedEditor(undefined, env)).toBe(false);
    expect(isAllowedEditor('105753631', {})).toBe(false);
    expect(isAllowedEditor('', { ADMIN_GITHUB_IDS: '' })).toBe(false);
  });

  it('ignores the old username list entirely', () => {
    expect(isAllowedEditor('muba123321', { ADMIN_GITHUB_LOGINS: 'muba123321' })).toBe(false);
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
