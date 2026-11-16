import { expect, test } from '@playwright/test';

test('the regions list runs north to south and links every region', async ({ page }) => {
  await page.goto('/regions');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Regions of Ghana');
  const links = page.getByRole('list', { name: 'Regions, north to south' }).getByRole('link');
  await expect(links).toHaveCount(16);
  await expect(links.first()).toHaveText(/Upper West/);
  await expect(links.last()).toHaveText(/Western/);
});

test('a region created in 2019 labels figures from its former region', async ({ page }) => {
  await page.goto('/regions/savannah');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Savannah');
  await expect(
    page.getByText('Created in 2019 from the Northern Region (before 2019).'),
  ).toBeVisible();
  const births = page.getByRole('region', { name: /Births attended by skilled staff/ });
  await births.getByText('Show the figures').click();
  await expect(births.getByRole('table')).toContainText(
    'figure for the Northern Region (before 2019)',
  );
  await expect(births.getByRole('table')).toContainText('Savannah');
});

test('an original region has no former-region labels', async ({ page }) => {
  await page.goto('/regions/ashanti');
  await expect(page.getByText(/Created in 2019/)).toHaveCount(0);
  await expect(page.getByText(/figure for the/)).toHaveCount(0);
});

test('figures that were never published say Not available', async ({ page }) => {
  await page.goto('/regions/ashanti');
  await expect(page.getByRole('region', { name: /Population \(census\)/ })).toContainText(
    'Not available',
  );
});

test('places and farm products are listed with their sources', async ({ page }) => {
  await page.goto('/regions/central');
  await expect(page.getByRole('region', { name: 'Places to visit' })).toContainText(
    'Cape Coast Castle',
  );
  await expect(page.getByRole('region', { name: 'Places to visit' })).toContainText(
    'UNESCO World Heritage',
  );
  await expect(page.getByRole('region', { name: 'Main farm products' })).toContainText('Pineapple');
});
