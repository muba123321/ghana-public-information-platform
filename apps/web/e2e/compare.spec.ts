import { expect, test } from '@playwright/test';

const CAVEAT = 'Being in office is not the same as causing a change.';

test('compares two governments on one topic from the picker', async ({ page }) => {
  await page.goto('/history/compare');
  await expect(page.getByText('Choose at least two governments to compare.')).toBeVisible();
  await page.getByLabel('First government').selectOption('2001-kufuor-i');
  await page.getByLabel('Second government').selectOption('2017-akufo-addo-i');
  await page.getByLabel('Topic').selectOption('economy');
  await page.getByRole('button', { name: 'Compare' }).click();
  await expect(page).toHaveURL(/a=2001-kufuor-i.*b=2017-akufo-addo-i/);
  await expect(page.getByText(CAVEAT)).toBeVisible();
  const inflation = page.getByRole('region', { name: /Inflation/ });
  await inflation.getByText('Show the figures').click();
  const table = inflation.getByRole('table');
  await expect(table.getByRole('columnheader', { name: /Inherited/ })).toBeVisible();
  await expect(table.getByRole('columnheader', { name: /Change/ })).toBeVisible();
  await expect(table.locator('tbody tr')).toHaveCount(2);
});

test('a government with no figures shows Not available, never zero', async ({ page }) => {
  await page.goto('/history/compare?a=1957-dominion&b=2017-akufo-addo-i&topic=social-development');
  const poverty = page.getByRole('region', { name: /Poverty/ });
  await poverty.getByText('Show the figures').click();
  await expect(poverty.getByRole('row', { name: /Dominion/ })).toContainText('Not available');
});

test('compare by person keeps separate periods in office apart', async ({ page }) => {
  await page.goto(
    '/history/compare?by=person&a=jerry-john-rawlings&b=john-agyekum-kufuor&topic=economy',
  );
  const inflation = page.getByRole('region', { name: /Inflation/ });
  await inflation.getByText('Show the figures').click();
  await expect(inflation.getByRole('row', { name: /Jerry John Rawlings \(1979\)/ })).toBeVisible();
  await expect(
    inflation.getByRole('row', { name: /Jerry John Rawlings \(1981–2001\)/ }),
  ).toBeVisible();
});

test('the API returns the same comparison as JSON and CSV', async ({ request }) => {
  const q = 'a=2001-kufuor-i&b=2017-akufo-addo-i&topic=economy';
  const json = await request.get(`/api/v1/compare?${q}`);
  expect(json.status()).toBe(200);
  expect((await json.json()).tenures).toHaveLength(2);
  const csv = await request.get(`/api/v1/compare?${q}&format=csv`);
  expect(csv.headers()['content-type']).toContain('text/csv');
  expect((await csv.text()).split('\n')[0]).toMatch(/^indicator,government/);
});

test('the page does not scroll sideways on a phone', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/history/compare?a=2001-kufuor-i&b=2017-akufo-addo-i&topic=economy');
  const width = await page.evaluate(() => document.documentElement.scrollWidth);
  expect(width).toBeLessThanOrEqual(390);
});

for (const colorScheme of ['light', 'dark'] as const) {
  test(`dropdown text is readable in ${colorScheme} mode`, async ({ page }) => {
    await page.emulateMedia({ colorScheme });
    await page.goto('/history/compare');
    const ratio = await page.getByLabel('First government').evaluate((el) => {
      const rgb = (c: string) => (c.match(/[\d.]+/g) ?? []).slice(0, 3).map(Number);
      const lum = (c: string) => {
        const [r = 0, g = 0, b = 0] = rgb(c).map((v) => {
          const s = v / 255;
          return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
        });
        return 0.2126 * r + 0.7152 * g + 0.0722 * b;
      };
      const cs = getComputedStyle(el);
      const [a, b] = [lum(cs.color), lum(cs.backgroundColor)].sort((x, y) => y - x);
      return ((a ?? 0) + 0.05) / ((b ?? 0) + 0.05);
    });
    expect(ratio).toBeGreaterThanOrEqual(4.5); // WCAG AA for normal text
  });
}
