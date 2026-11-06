import { test, expect } from '@playwright/test';

test('water and sleep animate with device reduced motion, and respect the in-game setting', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Kitchen', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Bathroom', exact: true }).click();
  await page.getByRole('button', { name: 'Use shower', exact: true }).click();
  const effects = page.getByTestId('bath-effects');
  await expect.poll(async () => Number(await effects.getAttribute('data-droplets'))).toBeGreaterThan(0);
  await page.getByRole('button', { name: 'Bedroom', exact: true }).click();
  await page.getByRole('button', { name: 'Put Pou to sleep' }).click();
  const z = page.locator('.sleep-effects span').first();
  await expect(z).toBeVisible();
  const position = await z.evaluate(el => getComputedStyle(el).transform);
  await expect.poll(() => z.evaluate(el => getComputedStyle(el).transform)).not.toBe(position);
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.getByLabel('Reduce motion').check();
  await page.getByRole('button', { name: 'Close menu' }).click();
  await expect.poll(() => z.evaluate(el => getComputedStyle(el).animationName)).toBe('none');
  await page.getByRole('button', { name: 'Wake Pou up' }).click();
  await page.getByRole('button', { name: 'Bathroom', exact: true }).click();
  await page.getByRole('button', { name: 'Use shower', exact: true }).click();
  await expect(effects).toHaveAttribute('data-water-active', 'true');
  await expect.poll(async () => Number(await effects.getAttribute('data-droplets'))).toBe(0);
});
