import test from 'node:test';
import assert from 'node:assert/strict';
import { GAMES } from '../src/lib/assets.ts';
import { arena } from './helpers/arena.ts';

test('Food Drop can move Pou to both physical edges of a wide screen',()=>{
  const a = arena();
  a.events.get('pointermove')!({clientX:1346,clientY:300});a.engine.draw();
  assert.ok(a.pous.at(-1)! > 1366*.9,'right-hand play area must be usable');
  a.events.get('pointermove')!({clientX:20,clientY:300});a.engine.draw();
  assert.ok(a.pous.at(-1)! < 1366*.1,'left-hand play area must be usable');
  a.engine.destroy();
});

test('Food Drop cloth covers the complete arena instead of a portrait strip',()=>{
  const a = arena();a.engine.draw();
  const cloth = a.sprites.filter(s=>s.path==='games/food/cloth.png');
  assert.ok(Math.min(...cloth.map(s=>s.x))<=1);
  assert.ok(Math.max(...cloth.map(s=>s.x+s.w))>=1365);
  a.engine.destroy();
});

test('food can spawn near the far side of the actual wide arena',()=>{
  const a = arena();a.engine.update(.9);a.engine.draw();
  const falling = a.sprites.filter(s=>s.path==='games/food/horseshoe.png');
  assert.ok(falling.some(s=>s.x+s.w/2>1366*.8));
  a.engine.destroy();
});

test('Memory reflows its cards into a wide layout rather than a small middle board',()=>{
  const a = arena('memory');a.engine.draw();
  const cards=a.sprites.filter(s=>s.path==='games/memory/card_back.png');
  assert.equal(cards.length,16);
  assert.ok(new Set(cards.map(s=>Math.round(s.x))).size>=8);
  a.engine.destroy();
});

test('all minigames preserve finite coordinates and progress after changing orientation',()=>{
  for(const game of GAMES){
    const a=arena(game.id);a.engine.update(1/60);a.engine.score=17;a.engine.draw();
    a.rect.width=820;a.rect.height=1050;a.resize();a.engine.draw();
    assert.equal(a.engine.score,17,`${game.name}: resize must not reset the run`);
    assert.ok(a.rectangles.every(rect=>rect.every(Number.isFinite)),`${game.name}: invalid background coordinate`);
    assert.ok(a.sprites.every(sprite=>Number.isFinite(sprite.x)&&Number.isFinite(sprite.w)),`${game.name}: invalid sprite coordinate`);
    a.engine.destroy();
  }
});
