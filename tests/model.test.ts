import test from 'node:test';
import assert from 'node:assert/strict';
import { newSave, parseSave, advance, level, spend, earn, levelProgress, NEEDS_PER_HOUR } from '../src/lib/model.ts';

test('exported progress round trips without losing inventory or appearance', () => {
  const save = newSave(1000);
  save.coins = 513; save.xp = 320;
  save.food.apple = 6; save.scores['food-drop'] = 49;
  save.appearance.body = '#f3a4b5'; save.appearance.hat = 'hats/100/black-pink.png';
  save.owned.push('hats/100/black-pink.png');
  assert.deepEqual(parseSave(JSON.parse(JSON.stringify(save))), save);
  assert.equal(level(save), 3);
});
test('old XP preserves level and progress on migration, without granting old level rewards twice',()=>{
  const old:any=newSave();delete old.xpVersion;old.xp=365;old.coins=123;
  const migrated=parseSave(old);assert.equal(level(migrated),5);assert.ok(Math.abs(levelProgress(migrated)-.25)<.01);assert.equal(migrated.coins,123);
  assert.deepEqual(parseSave(migrated),migrated);
});
test('level thresholds and rewards match the original progression',()=>{
  const save=newSave();earn(save,0,109);assert.equal(level(save),1);assert.equal(save.coins,200);
  earn(save,0,1);assert.equal(level(save),2);assert.equal(save.coins,220);
  earn(save,0,165);assert.equal(level(save),3);assert.equal(save.coins,250);
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
  assert.ok(Math.abs(later.stats.energy-(10+NEEDS_PER_HOUR.sleepEnergy/360))<1e-8);
  const full=advance(save,save.updatedAt+Math.ceil(90/NEEDS_PER_HOUR.sleepEnergy*3_600_000));
  assert.ok(full.stats.energy>99.999);assert.equal(full.sleeping,false);assert.equal(full.xp,50);
  assert.deepEqual(advance(later, later.updatedAt), later);
  assert.equal(save.stats.energy, 10);
});

test('health decays at the dirty rate independently of hunger', () => {
  const save = newSave(1000);
  save.stats.fullness = 19;
  assert.ok(Math.abs(advance(save, 1000 + 2 * 3_600_000).stats.health-(100-2*NEEDS_PER_HOUR.dirtyHealth))<1e-8);
  const step = advance(advance(save, 1000 + 3_600_000), 1000 + 2 * 3_600_000);
  assert.ok(Math.abs(step.stats.health-(100-2*NEEDS_PER_HOUR.dirtyHealth))<1e-8);
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
