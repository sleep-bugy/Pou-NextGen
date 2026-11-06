import test from 'node:test';
import assert from 'node:assert/strict';
import { newSave } from '../src/lib/model.ts';
import { emergencySave, loadSave, saveProgress, importSave } from '../src/lib/storage.ts';

const data = new Map<string, string>();
Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
  getItem: (key: string) => data.get(key) ?? null,
  setItem: (key: string, value: string) => { data.set(key, value); },
} });

test('save recovers progress from local backup when IndexedDB is unavailable', async () => {
  data.clear();
  const original = newSave(); original.coins = 917; original.food.burger = 9;
  await saveProgress(original);
  const loaded = await loadSave();
  assert.equal(loaded.save.coins, 917);
  assert.equal(loaded.save.food.burger, 9);
  assert.match(loaded.warning, /IndexedDB/);
});

test('a malformed import leaves the existing progress intact', async () => {
  data.clear();
  const original = newSave(); original.coins = 713;
  emergencySave(original);
  const before = data.get('pou-save-v1');
  await assert.rejects(() => importSave(new File(['{"version":1,"coins":-1}'], 'bad.json', { type: 'application/json' })));
  assert.equal(data.get('pou-save-v1'), before);
});

test('imported coins, inventory and appearance can be restored from a JSON file', async () => {
  data.clear();
  const incoming = newSave(); incoming.coins = 2134; incoming.appearance.body = '#f3a4b5'; incoming.food.water = 12;
  const imported = await importSave(new File([JSON.stringify(incoming)], 'pou-save.json', { type: 'application/json' }));
  assert.equal(imported.coins, 2134);
  const reloaded = await loadSave();
  assert.equal(reloaded.save.food.water, 12);
  assert.equal(reloaded.save.appearance.body, '#f3a4b5');
});

test('save errors are exposed when both persistent storage paths fail', async () => {
  const storage = globalThis.localStorage;
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { getItem() { throw new Error('Unavailable'); }, setItem() { throw new Error('Quota exceeded'); } } });
  try { await assert.rejects(() => saveProgress(newSave())); }
  finally { Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: storage }); }
});
