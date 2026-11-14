import { expect, test } from '@playwright/test';

test('the tracker filters by kind and links to the commitment', async ({ page }) => {
  await page.goto('/history/commitments?kind=funded_project');
  const list = page.locator('.commitment-list > li');
  await expect(list).toHaveCount(1);
  await expect(list.first()).toContainText('Eastern Corridor');
  await expect(list.first()).toContainText('Funded project');
  await list.first().getByRole('link').click();
  await expect(page).toHaveURL(/\/history\/commitments\/e2e-eastern-corridor$/);
});

test('a commitment shows each government’s own share of progress', async ({ page }) => {
  await page.goto('/history/commitments/e2e-eastern-corridor');
  await expect(page.locator('blockquote')).toContainText(
    'We will complete the Eastern Corridor road',
  );
  const rows = page.locator('.stewardship > li');
  await expect(rows).toHaveCount(2);
  await expect(rows.nth(0)).toContainText('+40 points');
  await expect(rows.nth(1)).toContainText('+60 points');
  await expect(page.getByText('GH₵1,200,000,000')).toBeVisible();
  await expect(page.getByText('US$90,000,000')).toBeVisible();
  await expect(page.locator('.money div', { hasText: 'Spent' })).toContainText('Not available');
});

test('search finds commitments by their wording', async ({ page }) => {
  await page.goto('/history/commitments');
  await page.getByLabel('Search wording').fill('corridor');
  await page.getByRole('button', { name: 'Show' }).click();
  await expect(page.locator('.commitment-list > li')).toHaveCount(1);
});

test('drafts and rejected items never appear publicly', async ({ page }) => {
  await page.goto('/history/commitments?q=great+again');
  await expect(page.getByText('No published commitment matches these filters.')).toBeVisible();
});

test('a completed commitment is not outstanding', async ({ page }) => {
  await page.goto('/history/outstanding');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Outstanding commitments');
  await expect(page.getByText('Eastern Corridor')).toHaveCount(0);
});

test('the profile groups commitments by how the government came to hold them', async ({ page }) => {
  await page.goto('/history/administrations/2017-akufo-addo-i');
  const inherited = page.locator('.profile-commitments div', {
    hasText: 'Inherited from earlier governments',
  });
  await expect(inherited).toContainText('Eastern Corridor');
});

test('sources link to the publisher and offer no copy unless licensed', async ({ page }) => {
  await page.goto('/history/sources');
  await expect(page.getByRole('link', { name: 'Test Manifesto 2012' })).toBeVisible();
  await expect(page.getByText('Copy available')).toHaveCount(0);
});
