import { expect, test, type Locator } from '@playwright/test';

async function box(locator: Locator) {
  await expect(locator).toBeVisible();
  return (await locator.boundingBox())!;
}

test('phone room controls stay clear of navigation in both languages and orientations', async ({ page }) => {
  for (const [width, height] of [[320, 568], [390, 844], [844, 390]]) {
    await page.setViewportSize({ width, height });
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Kitchen', exact: true })).toBeVisible();
    for (const label of ['English', 'Bahasa Indonesia']) {
      await page.locator('.bottom-tools button').last().click();
      await page.getByLabel('Language / Bahasa').selectOption({label});
      await page.locator('.dialog-heading button').click();
      const footer = await box(page.locator('.bottom-tools'));
      const tray = await box(page.locator('.item-tray'));
      expect(tray.y + tray.height).toBeLessThanOrEqual(footer.y);
      for (const button of await page.locator('.bottom-tools > button').all()) {
        const rect = await box(button);
        expect(rect.x).toBeGreaterThanOrEqual(0);
        expect(rect.x + rect.width).toBeLessThanOrEqual(width);
        expect(rect.y + rect.height).toBeLessThanOrEqual(height);
        const text = await box(button.locator('span'));
        expect(text.x).toBeGreaterThanOrEqual(rect.x - 2);
        expect(text.x + text.width).toBeLessThanOrEqual(rect.x + rect.width + 2);
      }
      await page.getByRole('button', {name: label === 'English' ? 'Bathroom' : 'Kamar Mandi', exact:true}).click();
      const hint = await box(page.locator('.bath-hint'));
      const bathFooter = await box(page.locator('.bottom-tools'));
      expect(hint.y + hint.height).toBeLessThanOrEqual(bathFooter.y);
      await page.getByRole('button', {name: label === 'English' ? 'Kitchen' : 'Dapur', exact:true}).click();
    }
    await page.locator('.bottom-tools button').last().click();
    await page.getByLabel('Language / Bahasa').selectOption({label:'English'});
    await page.locator('.dialog-heading button').click();
  }
});
