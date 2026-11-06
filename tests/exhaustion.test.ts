import test from 'node:test';
import assert from 'node:assert/strict';
import * as model from '../src/lib/model.ts';
import {consumePotion,partnerAction,meetPartner,endPouLife,revivePou} from '../src/lib/experiments.ts';

test('energy below ten forces rest immediately, including at an unchanged clock',()=>{
  const save=model.newSave(1000);save.stats.energy=9.9;
  const result=model.advance(save,1000);
  assert.equal(result.sleeping,true);assert.equal(result.exhausted,true);
  assert.equal(result.stats.energy,9.9);assert.equal(save.sleeping,false,'advancing must not mutate the input');
  const edge=model.newSave(1000);edge.stats.energy=10;
  assert.equal(model.advance(edge,1000).exhausted,false);
});
test('forced rest persists through reload and wake attempts until twenty energy',()=>{
  let save=model.newSave(1000);save.stats.energy=5;save=model.advance(save,1000);
  save.sleeping=false;save=model.advance(model.parseSave(JSON.parse(JSON.stringify(save))),11000);
  assert.equal(save.stats.energy,13);assert.equal(save.exhausted,true);assert.equal(save.sleeping,true);
  save=model.advance(save,21000);assert.equal(save.stats.energy,21);assert.equal(save.exhausted,false);
  save.sleeping=false;assert.equal(model.advance(save,21000).sleeping,false);
});
test('offline decay crosses the fatigue threshold once and then restores energy',()=>{
  const save=model.newSave(1000);save.stats.energy=12.5;
  const now=1000+3600000+5000;
  const whole=model.advance(save,now),split=model.advance(model.advance(save,1000+3600000),now);
  assert.equal(whole.sleeping,true);assert.equal(whole.exhausted,true);assert.ok(Math.abs(whole.stats.energy-14)<1e-6);
  assert.ok(Math.abs(split.stats.energy-whole.stats.energy)<1e-6);
  const overnight=model.advance(save,1000+2*3600000);assert.equal(overnight.stats.energy,100);assert.equal(overnight.exhausted,false);assert.equal(overnight.sleeping,true);
});
test('energy potions work during forced rest and antidotes do not bypass fatigue',()=>{
  let save=model.newSave(1000);save.stats.energy=5;save.potions.antidote=1;save=model.advance(save,1000);
  assert.equal(consumePotion(save,'antidote',1000),'');assert.equal(save.sleeping,true);assert.equal(save.exhausted,true);
  assert.equal(consumePotion(save,'2',1000),'');assert.equal(save.stats.energy,35);assert.equal(save.exhausted,false);
  const unlocked=model.newSave(1000);unlocked.stats.energy=1;unlocked.sleeping=true;unlocked.exhausted=true;unlocked.potions.infinite=1;
  assert.equal(consumePotion(unlocked,'infinite',1000),'');assert.equal(unlocked.stats.energy,100);assert.equal(unlocked.exhausted,false);
});
test('a partner walk can trigger exhaustion and cannot continue while Pou rests',()=>{
  const save=model.newSave(1000);save.stats.energy=11;meetPartner(save,'Mimi','#f3a4b5');
  assert.equal(partnerAction(save,'walk',10000),'');assert.equal(save.stats.energy,8);assert.equal(save.exhausted,true);assert.equal(save.sleeping,true);
  assert.notEqual(partnerAction(save,'walk',14000),'');
});
test('unlimited energy, death and revival take precedence over fatigue',()=>{
  const save=model.newSave(1000);save.stats.energy=2;save.boosts.unlimitedEnergy=true;
  const infinite=model.advance(save,1001);assert.equal(infinite.stats.energy,100);assert.equal(infinite.exhausted,false);assert.equal(infinite.sleeping,false);
  const tired=model.advance({...save,boosts:{unlimitedEnergy:false}},1000);endPouLife(tired);
  assert.equal(tired.exhausted,false);assert.equal(tired.sleeping,false);revivePou(tired);assert.equal(tired.exhausted,false);assert.ok(tired.stats.energy>=50);
});
test('legacy saves gain the fatigue field while invalid fatigue data is rejected',()=>{
  const old:any=model.newSave(1000);delete old.exhausted;old.food.apple=7;
  const migrated=model.parseSave(old);assert.equal(migrated.exhausted,false);assert.equal(migrated.food.apple,7);
  assert.throws(()=>model.parseSave({...migrated,exhausted:'true'}));
});
