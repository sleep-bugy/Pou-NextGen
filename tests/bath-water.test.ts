import test from 'node:test';
import assert from 'node:assert/strict';
import { BathWater, drawBathWater, pointOnPou, rinseFoam, showerHitsPou } from '../src/lib/bath.ts';

test('a running shower emits visible drops, body splashes and runoff without movement', () => {
  let seed = 17;
  const water = new BathWater(() => ((seed = seed * 16807 % 2147483647) / 2147483647));
  const kinds = new Set<string>();
  for (let i = 0; i < 90; i++) {
    water.step(1 / 60, { x: 50, y: 30 }, 820, 1180);
    water.particles.forEach(p => kinds.add(p.kind));
  }
  assert.deepEqual([...kinds].sort(), ['drop', 'runoff', 'splash']);
  assert.ok(water.wetness > 0);
  let strokes = 0;
  const c = { save() {}, restore() {}, beginPath() {}, ellipse() {}, fill() {}, stroke() { strokes++; }, moveTo() {}, lineTo() {}, arc() {} } as unknown as CanvasRenderingContext2D;
  drawBathWater(c, water, { x: 50, y: 30 }, 820, 1180);
  assert.ok(strokes > 5, 'drops must actually be painted, not only simulated');
});

test('water particles and puddles clear after switching the shower off', () => {
  const water = new BathWater(() => 0.5);
  for (let i = 0; i < 60; i++) water.step(1 / 60, { x: 50, y: 30 }, 820, 1180);
  for (let i = 0; i < 150; i++) water.step(1 / 60, null, 820, 1180);
  assert.equal(water.particles.length, 0);
  assert.equal(water.wetness, 0);
});

test('particle count remains bounded even during a long bath or a resumed frame', () => {
  const water = new BathWater(() => 0.35);
  for (let i = 0; i < 3600; i++) {
    water.step(i % 100 === 0 ? 3600 : 1 / 60, { x: 35, y: 26 }, 820, 1180);
    assert.ok(water.particles.length <= 160);
    assert.ok(water.particles.every(p => Number.isFinite(p.x) && Number.isFinite(p.y)));
  }
});

test('water hitting the background or sprayed below Pou cannot rinse Pou', () => {
  for (const [w,h] of [[820,1180],[390,844],[615,820]]) {
    assert.equal(showerHitsPou({ x: 50, y: 30 }, w, h), true);
    assert.equal(showerHitsPou({ x: 5, y: 25 }, w, h), false);
    assert.equal(showerHitsPou({ x: 50, y: 74 }, w, h), false);
    assert.equal(pointOnPou({ x: 50, y: 52 }, w, h), true);
    assert.equal(pointOnPou({ x: 15, y: 30 }, w, h), false);
  }
});

test('rinsing removes only foam under the spray', () => {
  const bubbles = [{ x: 50, y: 45, id: 1 }, { x: 75, y: 45, id: 2 }, { x: 50, y: 20, id: 3 }];
  assert.deepEqual(rinseFoam(bubbles, { x: 50, y: 30 }).map(b => b.id), [2,3]);
  assert.equal(bubbles.length, 3);
});

test('reduced motion keeps a visible, static spray without animated particles', () => {
  const water = new BathWater();
  water.step(1 / 60, { x: 50, y: 30 }, 820, 1180, true);
  assert.equal(water.particles.length, 0);
  let lines = 0;
  const c = { save() {}, restore() {}, beginPath() {}, ellipse() {}, fill() {}, stroke() {}, moveTo() {}, lineTo() { lines++; } } as unknown as CanvasRenderingContext2D;
  drawBathWater(c, water, { x: 50, y: 30 }, 820, 1180, true);
  assert.ok(lines >= 5);
});


test('shower droplets visibly travel between frames before hitting Pou', () => {
  const water = new BathWater(() => 0.5);
  water.step(1 / 60, { x: 50, y: 23 }, 820, 1180);
  const drop = water.particles.find(p => p.kind === 'drop');
  assert.ok(drop);
  const before = drop.y;
  water.step(1 / 60, { x: 50, y: 23 }, 820, 1180);
  assert.ok(drop.y > before);
});
