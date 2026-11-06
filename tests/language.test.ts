import test from 'node:test';
import assert from 'node:assert/strict';
import {newSave,parseSave} from '../src/lib/model.ts';
import {translate,roomName,itemName,gameInstruction,foodName,localMessage} from '../src/lib/language.ts';

test('language choice survives save and changes visible labels without changing identifiers',()=>{
  const save=newSave();save.settings.language='id';const restored=parseSave(JSON.parse(JSON.stringify(save)));
  assert.equal(restored.settings.language,'id');assert.equal(roomName('id','Kitchen'),'Dapur');assert.equal(roomName('en','Kitchen'),'Kitchen');
  assert.equal(itemName('en','Racun Alien'),'Alien Poison');assert.equal(itemName('id','Health Potion'),'Ramuan Kesehatan');
  assert.equal(translate('id','Siram','Water'),'Siram');assert.equal(translate('en','Siram','Water'),'Water');
  assert.equal(gameInstruction('id','hoops','Drag the ball'),'Tarik bola ke belakang lalu lepaskan untuk menembak!');assert.equal(gameInstruction('en','hoops','Drag the ball'),'Drag the ball');
  assert.throws(()=>parseSave({...restored,settings:{...restored.settings,language:'xx'}}));
});

test('food names, server errors and minigame results have translations while unknown player text is preserved',()=>{
  assert.equal(foodName('id','food/apple_juice.png'),'Jus Apel');
  assert.equal(foodName('en','food/apple_juice.png'),'Apple Juice');
  assert.equal(localMessage('en','Kode ruangan tidak ditemukan.'),'Room code not found.');
  assert.equal(localMessage('id','Game Over!'),'Permainan berakhir!');
  assert.equal(localMessage('en','A player’s own message'),'A player’s own message');
});


test('dynamic game prompts, errors and notices follow the selected language',()=>{
  assert.equal(localMessage('id','Round 4'),'Ronde 4');
  assert.equal(localMessage('id','Power 75%'),'Kekuatan 75%');
  assert.equal(localMessage('id','Drag the ball down-left, then release!'),'Tarik bola ke kiri bawah, lalu lepaskan!');
  assert.equal(localMessage('en','Racun Pusaran masih aktif. Tunggu lima detik atau gunakan penawar.'),'Spin Poison is still active. Wait five seconds or use an antidote.');
  assert.equal(localMessage('en','Undangan dikirim ke Sarah.'),'Invitation sent to Sarah.');
  assert.equal(localMessage('en','Petualang'),'Adventurous');
});
