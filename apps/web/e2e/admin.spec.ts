import { expect, type Page, test } from '@playwright/test';

async function signIn(page: Page, login = 'e2e-editor') {
  await page.goto('/api/auth/signin?callbackUrl=%2Fadmin');
  await page.getByLabel('GitHub login').fill(login);
  await page.getByRole('button', { name: /Sign in with Test editor/ }).click();
}

test.describe.configure({ mode: 'serial' });

test('the editor area requires sign-in', async ({ page }) => {
  await page.goto('/admin');
  await expect(page).toHaveURL(/\/api\/auth\/signin/);
});

test('archived originals are not public', async ({ request }) => {
  const docs = await request.get('/admin/documents');
  expect(docs.url()).toMatch(/signin/);
  const file = await request.get('/admin/documents/00000000-0000-0000-0000-000000000000/file', {
    maxRedirects: 0,
  });
  expect(file.status()).toBe(401);
});

test('a GitHub login that is not on the allow-list cannot sign in', async ({ page }) => {
  await signIn(page, 'someone-else');
  await page.goto('/admin');
  await expect(page).toHaveURL(/\/api\/auth\/signin/);
});

test('an action submitted after the session ends changes nothing', async ({ page, context }) => {
  await signIn(page);
  await page.goto('/admin/review');
  await page.getByRole('link', { name: /200 community day schools/ }).click();
  await context.clearCookies();
  await page.getByRole('button', { name: 'Approve and publish' }).click();
  await expect(page).toHaveURL(/\/api\/auth\/signin/);
  await signIn(page);
  await page.goto('/admin/review');
  await expect(page.getByRole('link', { name: /200 community day schools/ })).toBeVisible();
});

test('the editor reviews drafts against the source page, approves one and rejects one', async ({
  page,
}) => {
  await signIn(page);
  await expect(page.getByText('2 commitments waiting for review')).toBeVisible();
  await page.goto('/admin/review');
  await page.getByRole('link', { name: /200 community day schools/ }).click();
  await expect(page.locator('iframe')).toHaveAttribute(
    'src',
    /\/admin\/documents\/.+\/file#page=1$/,
  );
  await page
    .getByLabel('Wording (exactly as printed)')
    .fill('We will build 200 community day senior high schools.');
  await page.getByRole('button', { name: 'Approve and publish' }).click();

  // The next draft opens automatically.
  await expect(page.getByLabel('Wording (exactly as printed)')).toHaveValue(
    'We will make Ghana great again.',
  );
  await page.getByPlaceholder('e.g. not a checkable commitment').fill('Not a checkable commitment');
  await page.getByRole('button', { name: 'Reject' }).click();
  await expect(page.getByText('Nothing waiting.')).toBeVisible();
});

test('the documents screen shows each archive and its extraction run', async ({ page }) => {
  await signIn(page);
  await page.goto('/admin/documents');
  await expect(page.getByRole('cell', { name: /Test Manifesto 2012/ })).toBeVisible();
  await expect(page.getByText(/ok: 2\/2 queued \(claude-code-session/)).toBeVisible();
});
