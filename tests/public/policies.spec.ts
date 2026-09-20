import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

for (const path of ['/privacy', '/terms', '/accessibility']) {
  test(`${path} is readable without an account and has keyboard access`, async ({ page }) => {
    await page.goto(path);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await page.keyboard.press('Tab');
    await expect(page.getByRole('link', { name: 'Skip to document' })).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('main')).toBeFocused();
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
    expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze()).violations).toEqual([]);
  });
}

test('public registration stops before accepting personal information', async ({ page, request }) => {
  await page.goto('/register');
  await expect(page.getByRole('heading', { name: 'Private preview', exact: true })).toBeVisible();
  await expect(page.locator('input')).toHaveCount(0);
  const result = await request.post('/api/auth/register', { data: { name: 'Synthetic review', email: 'review@example.invalid', password: 'Synthetic review only 2026!' } });
  expect(result.status()).toBe(403);
  expect(await result.json()).toEqual({ error: 'Public registration is closed. Existing invited accounts can sign in.' });
});

test('public routes expose notices and do not start self analytics', async ({ page, request }) => {
  const collections: string[] = [];
  page.on('request', (req) => { if (new URL(req.url()).pathname === '/api/collect') collections.push(req.url()); });
  for (const path of ['/', '/pricing', '/demo', '/self-host', '/login']) {
    await page.goto(path);
    await expect(page.getByRole('navigation', { name: 'Policies', exact: true }).getByRole('link', { name: 'Privacy', exact: true })).toBeVisible();
    await expect(page.locator('script[src="/self-analytics.js"]')).toHaveCount(0);
  }
  expect(collections).toEqual([]);
  const script = await (await request.get('/self-analytics.js')).text();
  expect(script).not.toContain('sendBeacon');
  expect(script).not.toContain('sessionStorage');
});
