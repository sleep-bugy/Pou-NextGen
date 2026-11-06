import test from 'node:test';
import assert from 'node:assert/strict';
import { newSave, parseSave, advance, level, spend } from '../src/lib/model.ts';

test('exported progress round trips without losing inventory or appearance', () => {
  const save = newSave(1000);
  save.coins = 513; save.xp = 320;
  save.food.apple = 6; save.scores['food-drop'] = 49;
  save.appearance.body = '#f3a4b5'; save.appearance.hat = 'hats/100/black-pink.png';
  save.owned.push('hats/100/black-pink.png');
  assert.deepEqual(parseSave(JSON.parse(JSON.stringify(save))), save);
  assert.equal(level(save), 5);
});

test('a corrupt or incompatible import cannot replace a valid save', () => {
  const valid = newSave();
  for (const invalid of [null, {}, { ...valid, version: 2 }, { ...valid, coins: -5 }, { ...valid, xp: Infinity }, { ...valid, stats: { fullness: 15 } }, { ...valid, appearance: {} }, { ...valid, food: { '../bad': 3 } }, { ...valid, settings: {} }]) {
    assert.throws(() => parseSave(invalid));
  }
});

test('sleep restores energy while the browser is closed and is applied once', () => {
  const save = newSave(1_000_000);
  save.sleeping = true; save.stats.energy = 10;
  const later = advance(save, save.updatedAt + 10_000);
  assert.equal(later.stats.energy, 18);
  assert.equal(advance(save, save.updatedAt + 120_000).stats.energy, 100);
  assert.deepEqual(advance(later, later.updatedAt), later);
  assert.equal(save.stats.energy, 10);
});

test('offline health decay accounts for only the time below hunger/clean thresholds', () => {
  const save = newSave(1000);
  save.stats.fullness = 19;
  assert.equal(advance(save, 1000 + 2 * 3_600_000).stats.health, 98);
  const step = advance(advance(save, 1000 + 3_600_000), 1000 + 2 * 3_600_000);
  assert.equal(step.stats.health, 98);
});

test('a backwards clock cannot grant extra energy or consume stats', () => {
  const save = newSave(100000);
  assert.deepEqual(advance(save, 0), save);
});

test('purchases never deduct money on failure or accept invalid prices', () => {
  const save = newSave();
  assert.equal(spend(save, 201), false);
  assert.equal(spend(save, -1), false);
  assert.equal(spend(save, NaN), false);
  assert.equal(save.coins, 200);
  assert.equal(spend(save, 20), true);
  assert.equal(save.coins, 180);
});
