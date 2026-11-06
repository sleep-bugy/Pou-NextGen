import test from 'node:test';
import assert from 'node:assert/strict';
import {newSave,parseSave,advance} from '../src/lib/model.ts';
import {furnish,mixPotions,care,favoriteFood,personality,claimReward} from '../src/lib/world.ts';

test('old saves migrate world state; decoration purchases and moved positions survive reload',()=>{
  const old:any=newSave(1000);delete old.world;old.coins=300;let save=parseSave(old);
  assert.equal(furnish(save,'sofa','Bedroom'),'');assert.equal(save.coins,235);
  assert.equal(furnish(save,'sofa','Kitchen'),'');assert.equal(save.coins,235);assert.equal(save.world.home.placements.length,1);
  save.world.home.placements[0].x=82;save=parseSave(JSON.parse(JSON.stringify(save)));assert.equal(save.world.home.placements[0].x,82);
  assert.throws(()=>parseSave({...save,world:{...save.world,home:{owned:['sofa'],placements:[{item:'sofa',room:'Kitchen',x:Infinity,y:50}]}}}));
});
test('mixing validates stock, consumes both ingredients once, discovers a recipe and expires offline',()=>{
  let save=newSave(1000);save.potions['2']=1;save.potions['8']=1;
  assert.equal(mixPotions(save,'8','2',1000),'');assert.equal(save.potions['8'],0);assert.equal(save.potions['2'],0);assert.deepEqual(save.world.lab.discovered,['tiny']);
  assert.equal(save.world.lab.effect.until,16000);assert.notEqual(mixPotions(save,'8','2',1000),'');
  save=advance(parseSave(save),16001);assert.equal(save.world.lab.effect.kind,'none');
});
test('unknown mixes and missing duplicate ingredients do not consume stock',()=>{
  const save=newSave();save.potions['2']=1;const before=JSON.stringify(save);
  assert.notEqual(mixPotions(save,'2','2'),'');assert.notEqual(mixPotions(save,'1','2'),'');assert.equal(JSON.stringify(save),before);
});
test('care builds persistent habits, favorite food and affection with a concrete fun bonus',()=>{
  const save=newSave();for(let i=0;i<3;i++)care(save,'food','banana');assert.equal(favoriteFood(save),'banana');
  const before=save.stats.fun;care(save,'food','banana');assert.equal(save.stats.fun,before+3);
  for(let i=0;i<6;i++)care(save,'pet');assert.equal(personality(save),'Manja');assert.ok(parseSave(save).world.personality.bond>0);
});
test('server loot is applied once, preserves rare ownership and rejects invalid rewards',()=>{
  let save=newSave();const reward={id:'delivery-1',label:'Co-op',coins:50,xp:25,food:{apple:2},owned:['rewards/explorer-hat.svg']};
  assert.equal(claimReward(save,reward),true);save=parseSave(JSON.parse(JSON.stringify(save)));assert.equal(claimReward(save,reward),false);assert.equal(save.coins,250);assert.equal(save.food.apple,5);assert.equal(save.owned.length,1);
  assert.throws(()=>claimReward(save,{...reward,id:'bad',coins:999999}));assert.equal(save.coins,250);
});
