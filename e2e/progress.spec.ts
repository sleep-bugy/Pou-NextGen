import { test, expect, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { newSave } from '../src/lib/model';
import { createGameViewport, responsiveGrid } from '../src/lib/viewport';

async function openGame(page: Page) {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Kitchen', exact: true })).toBeVisible();
}

test('feeding and a food purchase survive a complete page reload', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', e => errors.push(e.message));
  await openGame(page);
  await page.getByRole('button', { name: 'Feed Apple', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Food: 94%' })).toBeVisible();
  await page.getByRole('button', { name: 'Shop', exact: true }).click();
  await page.getByRole('searchbox', { name: 'Search items' }).fill('Carrot');
  await page.getByRole('button', { name: 'Buy Carrot', exact: true }).click();
  await page.getByRole('button', { name: 'Close menu' }).click();
  await expect(page.getByRole('button', { name: /Coins: 195/ })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Kitchen', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: /Coins: 195/ })).toBeVisible();
  await page.getByRole('button', { name: 'Open fridge' }).click();
  await expect(page.getByRole('dialog').getByText('Carrot', { exact: true })).toBeVisible();
  await expect(page.getByRole('dialog').getByText('×2', { exact: true }).first()).toBeVisible();
  expect(errors).toEqual([]);
});

test('export, rejected corrupt import, and confirmed restore preserve progress', async ({ page }) => {
  await openGame(page);
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Ekspor Save', exact: true }).click();
  const output = await download;
  const exported = JSON.parse(await readFile((await output.path())!, 'utf8'));
  expect(exported.coins).toBe(200);
  await page.locator('input[type=file]').setInputFiles({ name: 'bad.json', mimeType: 'application/json', buffer: Buffer.from('{"version":1}') });
  await expect(page.getByRole('alert')).toContainText('rusak');
  const imported = newSave(); imported.coins = 843; imported.food.apple = 17;
  await page.locator('input[type=file]').setInputFiles({ name: 'pou-save.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(imported)) });
  await expect(page.getByRole('alertdialog')).toContainText('843 coins');
  await page.getByRole('button', { name: 'Ganti dengan save ini' }).click();
  await expect(page.getByRole('status')).toContainText('Progress restored');
  await page.reload();
  await expect(page.getByRole('button', { name: /Coins: 843/ })).toBeVisible();
  await page.getByRole('button', { name: 'Open fridge' }).click();
  await expect(page.getByRole('dialog').getByText('×17', { exact: true })).toBeVisible();
});

test('a completed minigame grants its reward once and retains the high score', async ({ page }) => {
  await page.addInitScript(() => Math.random = () => 0);
  await openGame(page);
  await page.getByRole('button', { name: 'Fun: 80%' }).click();
  await page.getByRole('button', { name: 'Open games' }).click();
  await page.getByRole('button', { name: /^Memory Best:/ }).click();
  await page.getByRole('button', { name: 'Play!', exact: true }).click();
  const canvas = page.locator('.game-canvas');
  const rect = (await canvas.boundingBox())!;
  const fit = createGameViewport(rect.width, rect.height);
  const grid = responsiveGrid(fit.width,fit.height,16,135);
  const clickCard = async (i: number) => {
    await canvas.click({ position: { x: (grid.left+(i%grid.columns+.5)*grid.cell)*fit.scale, y: (grid.top+(Math.floor(i/grid.columns)+.5)*grid.cell)*fit.scale } });
  };
  for (let i = 0; i < 8; i++) { await clickCard(i); await clickCard(i + 8); }
  await expect(page.getByRole('heading', { name: 'Great memory!' })).toBeVisible();
  await expect(page.locator('.large-score')).toHaveText('Score: 80');
  await page.getByRole('button', { name: 'Games', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Memory Best: 80' })).toBeVisible();
  await page.getByRole('button', { name: 'Close menu' }).click();
  await page.reload();
  await expect(page.getByRole('button', { name: /Coins: 226/ })).toBeVisible();
});

test('iPad and phone layouts fit without horizontal overflow', async ({ page }) => {
  await openGame(page);
  for (const [width, height] of [[820,1180], [1180,820], [390,844], [1366,615], [1920,1080]]) {
    await page.setViewportSize({ width, height });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    const scene = (await page.locator('.playfield').boundingBox())!;
    expect(Math.abs(scene.width - width)).toBeLessThan(2);
    expect(Math.abs(scene.height - height)).toBeLessThan(2);
    const status = (await page.locator('.hud').boundingBox())!;
    const title = (await page.locator('.room-title').boundingBox())!;
    expect(title.y).toBeGreaterThan(status.y + status.height + 3);
    const previous = (await page.getByRole('button',{name:'Previous room',exact:true}).boundingBox())!;
    const next = (await page.getByRole('button',{name:'Next room',exact:true}).boundingBox())!;
    expect(previous.x).toBeLessThan(width * 0.12);
    expect(next.x + next.width).toBeGreaterThan(width * 0.88);
    const tools = await page.locator('.bottom-tools > button').all();
    for (const tool of tools) {
      const box = (await tool.boundingBox())!;
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.y + box.height).toBeLessThanOrEqual(height);
      const label = (await tool.locator('span').boundingBox())!;
      expect(label.width).toBeLessThanOrEqual(box.width + 2);
    }
    await expect(page.getByRole('button', { name: 'Feed Apple', exact: true })).toBeInViewport();
  }
});

test('shower water is visible and rinses continuously until stopped', async ({ page }) => {
  await openGame(page);
  await page.getByRole('button', { name:'Bathroom', exact:true }).click();
  await page.getByRole('button', { name:'Use soap', exact:true }).click();
  await page.getByRole('button', { name:'Wash Pou', exact:true }).click();
  const effects = page.getByTestId('bath-effects');
  await expect.poll(async () => Number(await effects.getAttribute('data-foam-count'))).toBeGreaterThan(0);
  await page.getByRole('button', { name:'Use shower', exact:true }).click();
  await expect(effects).toHaveAttribute('data-water-active','true');
  await expect.poll(async () => Number(await effects.getAttribute('data-droplets'))).toBeGreaterThan(0);
  await expect.poll(async () => Number(await page.locator('.clean-meter progress').getAttribute('value'))).toBeGreaterThan(80);
  await expect(effects).toHaveAttribute('data-foam-count','0');
  await page.getByRole('button', { name:'Use shower', exact:true }).click();
  await expect(effects).toHaveAttribute('data-water-active','false');
});
