import { expect, test } from '@playwright/test';

test('anyone can report an error, and it reaches the editor', async ({ page }) => {
  await page.goto('/history/commitments/e2e-eastern-corridor');
  await page.getByRole('link', { name: 'Report an error' }).first().click();
  await expect(page).toHaveURL(/\/report\?from=%2Fhistory%2Fcommitments%2Fe2e-eastern-corridor/);
  await page.getByLabel('What looks wrong?').fill('The road reached Bawku in 2019, not 2020.');
  await page.getByLabel('Link to evidence (optional)').fill('https://example.org/evidence');
  await page.getByRole('button', { name: 'Send report' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'Thank you — an editor will review this.',
  );

  await page.goto('/api/auth/signin?callbackUrl=%2Fadmin');
  await page.getByLabel('Test editor id').fill('e2e-editor');
  await page.getByRole('button', { name: /Sign in with Test editor/ }).click();
  await page.waitForURL(/\/admin$/);
  await page.goto('/admin/corrections');
  await expect(page.getByText('The road reached Bawku in 2019, not 2020.')).toBeVisible();
});

test('a filled honeypot is accepted silently and not stored', async ({ page }) => {
  await page.goto('/report?from=%2F');
  await page.getByLabel('What looks wrong?').fill('BOT-MESSAGE-123');
  await page.locator('input[name="website"]').fill('http://spam.example', { force: true });
  await page.getByRole('button', { name: 'Send report' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'Thank you — an editor will review this.',
  );
  await page.goto('/api/auth/signin?callbackUrl=%2Fadmin');
  await page.getByLabel('Test editor id').fill('e2e-editor');
  await page.getByRole('button', { name: /Sign in with Test editor/ }).click();
  await page.waitForURL(/\/admin$/);
  await page.goto('/admin/corrections');
  await expect(page.getByText('BOT-MESSAGE-123')).toHaveCount(0);
});

test('the public change log lists published changes only', async ({ page }) => {
  await page.goto('/changes');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Change log');
  await expect(page.locator('tbody tr').first()).toBeVisible();
  await expect(page.getByText('correction_reports')).toHaveCount(0);
  await expect(page.locator('footer').getByRole('link', { name: 'Change log' })).toHaveAttribute(
    'href',
    '/changes',
  );
});
