import { expect, type Page, test } from '@playwright/test';

// Local-only guard for the architecture refactor: every page must look exactly as it did before.
// Run `pnpm --filter @gpip/web e2e:visual` (baseline: add --update-snapshots on the old code).

const PUBLIC: [string, string][] = [
  ['home', '/'],
  ['history', '/history'],
  ['administrations', '/history/administrations'],
  ['administration', '/history/administrations/2017-akufo-addo-i'],
  ['indicators', '/history/indicators'],
  ['indicator-inflation', '/history/indicators/inflation'],
  ['indicator-poverty', '/history/indicators/poverty'],
  ['commitments', '/history/commitments'],
  ['commitments-funded', '/history/commitments?kind=funded_project'],
  ['commitment', '/history/commitments/e2e-eastern-corridor'],
  ['outstanding', '/history/outstanding'],
  ['ministries', '/history/ministries'],
  ['sources', '/history/sources'],
  ['changes', '/changes'],
  ['report', '/report?from=%2F'],
  ['report-thanks', '/report/thanks'],
  ['data-notice', '/data-notice'],
];

async function snap(page: Page, name: string) {
  const canvas = page.locator('canvas');
  if (await canvas.count()) await expect(canvas.first()).toBeVisible();
  await expect(page).toHaveScreenshot(`${name}.png`, { fullPage: true, animations: 'disabled' });
}

for (const [name, url] of PUBLIC) {
  test(`public: ${name}`, async ({ page }) => {
    await page.goto(url);
    await snap(page, name);
  });
}

test('public: ministry', async ({ page }) => {
  await page.goto('/history/ministries');
  await page.locator('main a[href^="/history/ministries/"]').first().click();
  await page.waitForURL(/\/history\/ministries\/.+/);
  await snap(page, 'ministry');
});

test.describe('admin', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/api/auth/signin?callbackUrl=%2Fadmin');
    await page.getByLabel('Test editor id').fill('e2e-editor');
    await page.getByRole('button', { name: /Sign in with Test editor/ }).click();
    await page.waitForURL(/\/admin$/);
  });

  for (const [name, url] of [
    ['admin', '/admin'],
    ['admin-review', '/admin/review'],
    ['admin-documents', '/admin/documents'],
    ['admin-corrections', '/admin/corrections'],
  ] as const) {
    test(name, async ({ page }) => {
      await page.goto(url);
      await snap(page, name);
    });
  }

  test('admin-review-item', async ({ page }) => {
    await page.goto('/admin/review');
    await page.locator('main a[href^="/admin/review/"]').first().click();
    await page.waitForURL(/\/admin\/review\/.+/);
    // The embedded PDF viewer renders differently run to run.
    await expect(page).toHaveScreenshot('admin-review-item.png', {
      fullPage: true,
      animations: 'disabled',
      mask: [page.locator('iframe')],
    });
  });
});
