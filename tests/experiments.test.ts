import test from 'node:test';
import assert from 'node:assert/strict';
import { newSave,parseSave,advance,NEEDS_PER_HOUR } from '../src/lib/model.ts';
import { poisonPou,antidotePou,endPouLife,revivePou,meetPartner,partnerAction } from '../src/lib/experiments.ts';

test('old saves gain the new feature fields without losing progress',()=>{
  const original=newSave(1000),old:any=JSON.parse(JSON.stringify(original));old.coins=714;old.food.apple=8;delete old.life;delete old.partner;delete old.onlineRewarded;
  const migrated=parseSave(old);assert.equal(migrated.coins,714);assert.equal(migrated.food.apple,8);assert.equal(migrated.life.state,'alive');assert.equal(migrated.partner.unlocked,false);
});
test('fictional poison advances once with time and antidote stops further damage',()=>{
  let save=newSave(1000);poisonPou(save);assert.equal(save.life.state,'poisoned');
  save=advance(save,11000);assert.ok(Math.abs(save.stats.health-(77-NEEDS_PER_HOUR.dirtyHealth/360))<1e-8);antidotePou(save);const health=save.stats.health;
  save=advance(save,21000);assert.equal(save.life.state,'alive');assert.ok(Math.abs(save.stats.health-(health-NEEDS_PER_HOUR.dirtyHealth/360))<1e-8);
});
test('poison can end the character life and revival keeps coins, XP, wardrobe and partner',()=>{
  let save=newSave(1000);save.coins=543;save.xp=100;meetPartner(save,'Mimi','#f3a4b5');save.owned.push('hats/100/black-pink.png');poisonPou(save);save=advance(save,121000);
  assert.equal(save.life.state,'dead');assert.equal(save.life.deaths,1);const coins=save.coins;
  revivePou(save);assert.equal(save.life.state,'alive');assert.equal(save.coins,coins);assert.equal(save.xp,100);assert.equal(save.partner.name,'Mimi');assert.equal(save.owned.length,1);
});
test('ending an already dead character cannot count a second death',()=>{
  const save=newSave();assert.equal(endPouLife(save),true);assert.equal(endPouLife(save),false);assert.equal(save.life.deaths,1);assert.equal(antidotePou(save),false);
});
test('partner interactions spend coins and enforce their cooldown',()=>{
  const save=newSave(1000);assert.equal(meetPartner(save,'Luna','#f3a4b5'),'');assert.equal(save.coins,150);
  assert.equal(partnerAction(save,'flower',10000),'');assert.equal(save.coins,140);assert.equal(save.partner.bond,8);
  assert.notEqual(partnerAction(save,'flower',11000),'');assert.equal(save.coins,140);
  assert.equal(partnerAction(save,'walk',14000),'');assert.equal(save.partner.bond,14);
});
test('invalid new fields are rejected before an import replaces progress',()=>{
  const save=newSave();assert.throws(()=>parseSave({...save,life:{state:'unknown',poisonSeconds:0,deaths:0}}));assert.throws(()=>parseSave({...save,partner:{...save.partner,body:'url(evil)'}}));
});
