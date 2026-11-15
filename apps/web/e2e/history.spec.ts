import { expect, test } from '@playwright/test';

const NOTICE = /All information on this platform is compiled from publicly available sources/;

test('directory lists every administration from 1957 to today', async ({ page }) => {
  await page.goto('/history/administrations');
  const rows = page.locator('.spine > li');
  await expect(rows).toHaveCount(19);
  await expect(rows.first()).toContainText('Kwame Nkrumah');
  await expect(rows.last()).toContainText('John Dramani Mahama');
  await expect(page.getByRole('contentinfo').getByText(NOTICE)).toBeVisible();
});

test('profile shows both presidents of the 2009–2013 term with sources and navigation', async ({
  page,
}) => {
  await page.goto('/history/administrations');
  await page
    .locator('.spine')
    .getByRole('link', { name: /2009–2013/ })
    .click();
  await expect(page).toHaveURL(/\/history\/administrations\/2009-mills-mahama$/);
  await expect(page.getByText('John Evans Atta Mills')).toBeVisible();
  await expect(page.getByText('7 Jan 2009 – 24 Jul 2012').first()).toBeVisible();
  await expect(page.getByText('John Dramani Mahama').first()).toBeVisible();
  const source = page.getByRole('link', { name: /List of heads of state of Ghana/ });
  await expect(source).toHaveAttribute('href', /^https:\/\//);
  await expect(page.getByRole('link', { name: /Previous/ })).toHaveAttribute(
    'href',
    /2005-kufuor-ii/,
  );
  await expect(page.getByRole('link', { name: /Next/ })).toHaveAttribute('href', /2013-mahama-i/);
  await expect(page.getByRole('contentinfo').getByText(NOTICE)).toBeVisible();
});

test('unknown administration returns 404', async ({ page }) => {
  const res = await page.goto('/history/administrations/unknown');
  expect(res?.status()).toBe(404);
});

test('history landing lists the nine areas', async ({ page }) => {
  await page.goto('/history');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'Government Performance & History',
  );
  await expect(page.getByRole('link', { name: 'Administration directory' })).toBeVisible();
  await expect(page.getByText('Coming soon')).toHaveCount(3);
});

test('data notice covers every required section', async ({ page }) => {
  await page.goto('/data-notice');
  for (const h of [
    'Sources and licences',
    'No endorsement',
    'Figures as published',
    'In office is not causation',
    'No warranty',
    'Corrections',
    'Contact',
  ]) {
    await expect(page.getByRole('heading', { name: h })).toBeVisible();
  }
  await expect(page.getByRole('contentinfo').getByText(NOTICE)).toBeVisible();
});

test('home page timeline links all 19 governments', async ({ page }) => {
  await page.goto('/');
  const ribbon = page.getByRole('list', { name: 'Governments of Ghana from 1957 to today' });
  await expect(ribbon.getByRole('link')).toHaveCount(19);
  await ribbon.getByRole('link', { name: /Provisional National Defence Council/ }).click();
  await expect(page).toHaveURL(/1981-pndc$/);
  await expect(page.locator('.ribbon a[aria-current="page"]')).toHaveAccessibleName(
    /Provisional National Defence Council/,
  );
});

test('directory can be filtered to military governments', async ({ page }) => {
  await page.goto('/history/administrations');
  await page
    .getByRole('navigation', { name: 'Filter governments' })
    .getByRole('link', { name: 'Military' })
    .click();
  await expect(page).toHaveURL(/\?kind=military$/);
  await expect(page.locator('.spine > li')).toHaveCount(6);
  await expect(page.locator('.spine')).not.toContainText('Fourth Republic');
});
