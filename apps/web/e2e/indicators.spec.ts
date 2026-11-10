import { expect, test } from '@playwright/test';

test('indicator index lists the whole catalogue by sector', async ({ page }) => {
  await page.goto('/history/indicators');
  await expect(page.locator('.indicator-list > li')).toHaveCount(17);
  await expect(page.getByRole('heading', { name: 'Economy' })).toBeVisible();
});

test('inflation page shows the chart, table and source', async ({ page }) => {
  await page.goto('/history/indicators/inflation');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Inflation, consumer prices');
  const chart = page.getByRole('img', { name: /Chart of Inflation, consumer prices/ });
  await expect(chart).toBeVisible();
  await expect(chart.locator('svg')).toBeVisible();
  await page.getByText('Show the figures as a table').click();
  await expect(page.getByRole('row', { name: /^2016 / })).toBeVisible();
  await expect(page.getByRole('link', { name: 'World Development Indicators' })).toHaveAttribute(
    'href',
    /^https:\/\//,
  );
  await expect(page.getByText('Lehman Brothers files for bankruptcy')).toBeVisible();
});

test('poverty is shown only for survey years', async ({ page }) => {
  await page.goto('/history/indicators/poverty');
  await expect(page.getByText('Values exist only for survey years')).toBeVisible();
  await page.getByText('Show the figures as a table').click();
  await expect(page.locator('.series-table tbody tr')).toHaveCount(7);
});

test('debt projections are labelled, never shown as actual values', async ({ page }) => {
  await page.goto('/history/indicators/public-debt');
  await expect(page.locator('figcaption').getByText('IMF projection')).toBeVisible();
  await page.getByText('Show the figures as a table').click();
  await expect(page.getByRole('row', { name: /^2031 .*IMF projection/ })).toBeVisible();
});

test('an indicator with no imported figures says so', async ({ page }) => {
  await page.goto('/history/indicators/gdp-growth');
  await expect(page.getByText('Not available')).toBeVisible();
});

test('an unknown indicator returns 404', async ({ page }) => {
  const res = await page.goto('/history/indicators/not-real');
  expect(res?.status()).toBe(404);
});
