import test from 'node:test';
import assert from 'node:assert/strict';
import { advance, collectPoop, newSave, parseSave } from '../src/lib/model.ts';

test('dirt timer can create poop with a 50% chance, and collecting pays once', () => {
  const save = newSave(1000);
  const before = advance(save, 1000 + 1_799_999, () => 0.1);
  assert.equal(before.bathroom.poops, 0);
  const dirty = advance(before, 1000 + 1_800_000, () => 0.1);
  assert.equal(dirty.bathroom.poops, 1);
  assert.equal(dirty.bathroom.dirtyRemainingMs, 21_600_000);
  const coins = dirty.coins;
  assert.equal(collectPoop(dirty), true);
  assert.equal(collectPoop(dirty), false);
  assert.equal(dirty.coins, coins + 5);
  const noPoop = advance(save, 1000 + 1_800_000, () => 0.5);
  assert.equal(noPoop.bathroom.poops, 0);
});

test('bathroom progress persists offline and old saves retain existing poop', () => {
  const old:any = newSave(1000); delete old.bathroom; old.coins = 321;
  const migrated = parseSave(old);
  assert.deepEqual(migrated.bathroom, {poops:0, dirtyRemainingMs:1_800_000});
  assert.equal(migrated.coins, 321);
  const early = parseSave({...migrated, bathroom:{poops:2, meals:1}});
  assert.equal(early.bathroom.poops, 2);
  const after = advance(early, 1000 + 1_800_000, () => 0.1);
  assert.equal(after.bathroom.poops, 3);
  assert.equal(early.bathroom.poops, 2);
  assert.deepEqual(parseSave(JSON.parse(JSON.stringify(after))).bathroom, after.bathroom);
  assert.throws(() => parseSave({...after, bathroom:{poops:101, dirtyRemainingMs:1}}));
});

test('a dead Pou does not generate bathroom items while inactive', () => {
  const save = newSave(1000);
  save.life.state = 'dead';
  const after = advance(save, 1000 + 2_000_000, () => 0);
  assert.equal(after.bathroom.poops, 0);
  assert.equal(after.bathroom.dirtyRemainingMs, save.bathroom.dirtyRemainingMs);
});
