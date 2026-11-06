import test from 'node:test';
import assert from 'node:assert/strict';
import { newSave,parseSave,advance } from '../src/lib/model.ts';
import { consumePotion,meetPartner,partnerAction } from '../src/lib/experiments.ts';
import { POTIONS } from '../src/lib/assets.ts';

test('spin poison lasts exactly five seconds, including after save/reload',()=>{
  let save=newSave(1000);save.potions.spin=1;
  assert.equal(consumePotion(save,'spin',1000),'');assert.equal(save.effects.spinUntil,6000);assert.equal(save.potions.spin,0);
  save=advance(parseSave(JSON.parse(JSON.stringify(save))),5999);assert.equal(save.effects.spinUntil,6000);
  save=advance(save,6000);assert.equal(save.effects.spinUntil,0);
});
test('antidote stops spin and poison together and a missing potion does nothing',()=>{
  const save=newSave(1000);save.potions.poison=1;save.potions.spin=1;save.potions.antidote=1;
  consumePotion(save,'poison',1000);consumePotion(save,'spin',1000);consumePotion(save,'antidote',1000);
  assert.equal(save.life.state,'alive');assert.equal(save.effects.spinUntil,0);
  const before=JSON.stringify(save);assert.notEqual(consumePotion(save,'spin',1000),'');assert.equal(JSON.stringify(save),before);
});
test('unlimited energy costs 9999 and survives sleep, offline time and partner walks',()=>{
  assert.equal(POTIONS.find(p=>p.id==='infinite')?.price,9999);
  let save=newSave(1000);save.potions.infinite=1;save.stats.energy=1;
  assert.equal(consumePotion(save,'infinite',1000),'');assert.equal(save.boosts.unlimitedEnergy,true);assert.equal(save.stats.energy,100);
  save.stats.energy=40;save=advance(parseSave(save),3601000);assert.equal(save.stats.energy,100);
  meetPartner(save,'Mimi','#f3a4b5');assert.equal(partnerAction(save,'walk',3601000),'');assert.equal(save.stats.energy,100);
  const before=JSON.stringify(save);save.potions.infinite=1;const stocked=JSON.stringify(save);assert.notEqual(consumePotion(save,'infinite'), '');assert.equal(JSON.stringify(save),stocked);assert.ok(before);
});
test('sleep poison can be cured while asleep and cannot defeat unlimited energy',()=>{
  const save=newSave();save.potions.drowsy=2;save.potions.antidote=1;save.potions.infinite=1;
  assert.equal(consumePotion(save,'drowsy'),'');assert.equal(save.sleeping,true);assert.equal(save.stats.energy,5);
  assert.equal(consumePotion(save,'antidote'),'');assert.equal(save.sleeping,true);assert.equal(save.exhausted,true);
  consumePotion(save,'infinite');assert.notEqual(consumePotion(save,'drowsy'),'');assert.equal(save.potions.drowsy,1);assert.equal(save.stats.energy,100);
});
test('older saves migrate new potion effects without losing stock',()=>{
  const old:any=newSave(1000);delete old.effects;delete old.boosts;old.potions.poison=3;
  const save=parseSave(old);assert.equal(save.effects.spinUntil,0);assert.equal(save.boosts.unlimitedEnergy,false);assert.equal(save.potions.poison,3);
  assert.throws(()=>parseSave({...save,effects:{spinUntil:-10}}));assert.throws(()=>parseSave({...save,boosts:{unlimitedEnergy:'yes'}}));
});
