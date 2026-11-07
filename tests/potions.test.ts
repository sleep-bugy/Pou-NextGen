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
test('baby and adult potions change body size without deleting or inventing level progress',()=>{
  const save=newSave();save.bodySize=1;save.xp=600;save.potions['6']=2;save.potions['7']=2;
  save.appearance.hat='hats/100/black-pink.png';save.owned.push(save.appearance.hat);
  assert.equal(consumePotion(save,'6'),'');assert.equal(save.bodySize,.5);assert.equal(save.xp,700);
  assert.equal(save.appearance.hat,'');assert.equal(save.owned.length,1);
  assert.notEqual(consumePotion(save,'6'),'');assert.equal(save.potions['6'],1);
  assert.equal(consumePotion(save,'7'),'');assert.equal(save.bodySize,1);assert.equal(save.xp,800);
  assert.notEqual(consumePotion(save,'7'),'');assert.equal(save.potions['7'],1);
  const old:any={...save};delete old.bodySize;assert.equal(parseSave(old).bodySize,1);
});
test('official potions use their original IDs, effects and rejection rules',()=>{
  const save=newSave();save.stats.health=40;save.potions['1']=1;assert.equal(consumePotion(save,'1'),'');assert.equal(save.stats.health,90);assert.equal(save.xp,25);
  save.potions['2']=1;assert.notEqual(consumePotion(save,'2'),'');assert.equal(save.potions['2'],1);
  save.stats.health=20;assert.equal(consumePotion(save,'2'),'');assert.equal(save.stats.health,45);assert.equal(save.xp,40);
  save.obesity=30;save.potions['3']=1;assert.equal(consumePotion(save,'3'),'');assert.equal(save.obesity,0);
  save.stats.energy=20;save.potions['4']=1;assert.equal(consumePotion(save,'4'),'');assert.equal(save.stats.energy,100);
  save.stats.fullness=95;save.potions['5']=1;assert.equal(consumePotion(save,'5'),'');assert.equal(save.stats.fullness,0);
  save.stats.clean=42;save.potions['8']=1;assert.equal(consumePotion(save,'8'),'');assert.equal(save.stats.fullness,100);assert.equal(save.stats.clean,42);
});
test('legacy potion inventory and discovered combinations retain their meanings',()=>{
  const old:any=newSave();delete old.potionVersion;old.potions={'1':2,'2':3,'4':4,'8':5};
  old.world.lab.discovered=['tiny','mix_2_poison'];
  const save=parseSave(old);assert.equal(save.potions['4'],3);assert.equal(save.potions['8'],4);assert.equal(save.potions.fun,5);
  assert.deepEqual(save.world.lab.discovered,['tiny','mix_4_poison']);
  assert.deepEqual(parseSave(JSON.parse(JSON.stringify(save))).potions,save.potions);
});
