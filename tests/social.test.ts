import test from 'node:test';
import assert from 'node:assert/strict';
import {SocialHub} from '../server/social.mjs';
import {RoomHub} from '../server/rooms.mjs';

function network(state?:any){
  let serial=0,nonce=0,now=10000,changes=0;const packets=new Map<string,any[]>();
  const rooms=new RoomHub({now:()=>now});
  const social=new SocialHub(rooms,{state,now:()=>now,id:()=>`social-${++serial}`,token:()=>(++nonce).toString(16).padStart(8,'0').padEnd(64,'a'),onchange:()=>changes++});
  const connect=(id:string,name:string,token?:string)=>{packets.set(id,[]);const send=(p:any)=>packets.get(id)!.push(p);rooms.connect(id,send);social.connect(id,send);social.message(id,{type:'hello',name,token});};
  const friends=(one='one',two='two')=>{social.message(one,{type:'friend_request',code:social.profile(two).code});social.message(two,{type:'friend_accept',target:social.profile(one).id});};
  return {rooms,social,packets,connect,friends,later:(ms:number)=>now+=ms,changes:()=>changes};
}
test('friend requests require consent and both friends see presence and room invitations',()=>{
  const n=network();n.connect('one','Adi');n.connect('two','Mimi');
  const one=n.social.profile('one'),two=n.social.profile('two');
  n.social.message('one',{type:'friend_request',code:two.code});assert.equal(one.friends.length,0);assert.deepEqual(two.requests,[one.id]);
  n.social.message('two',{type:'friend_accept',target:one.id});assert.deepEqual(one.friends,[two.id]);assert.deepEqual(two.friends,[one.id]);
  assert.equal(n.social.snapshot('one').friends[0].online,true);
  n.social.message('one',{type:'invite',target:two.id});
  const invitation=n.packets.get('two')!.find(p=>p.type==='invitation').invitation;assert.equal(n.rooms.rooms.size,1);
  n.social.message('two',{type:'invite_accept',id:invitation.id});
  assert.equal(n.rooms.clients.get('one').room,n.rooms.clients.get('two').room);assert.equal(n.rooms.rooms.get(invitation.code).players.size,2);
});
test('friend data survives server restart and a token restores identity without exposing it publicly',()=>{
  const n=network();n.connect('one','Adi');n.connect('two','Mimi');n.friends();
  const token=n.packets.get('one')!.find(p=>p.type==='welcome').token;
  const original=n.social.profile('one'),stored=n.social.dump();
  assert.ok(!JSON.stringify(stored).includes(token));assert.ok(!JSON.stringify(n.social.snapshot('one')).includes('tokenHash'));
  const restarted=network(stored);restarted.connect('returning','Adi',token);
  assert.equal(restarted.social.profile('returning').id,original.id);assert.equal(restarted.social.profile('returning').code,original.code);assert.equal(restarted.social.profile('returning').friends.length,1);
  assert.equal(restarted.social.snapshot('returning').friends[0].online,false);
});
test('public chat reaches all authenticated clients, preserves plain text and limits spam',()=>{
  const n=network();n.connect('one','Adi');n.connect('two','Mimi');
  n.social.message('one',{type:'chat',text:'Halo <script>hello</script>'});
  const sent=n.packets.get('two')!.at(-1);assert.equal(sent.type,'chat_message');assert.equal(sent.message.text,'Halo <script>hello</script>');
  n.social.message('one',{type:'chat',text:'too soon'});assert.equal(n.social.chat.length,1);assert.equal(n.packets.get('one')!.at(-1).type,'error');
  n.later(2000);n.social.message('one',{type:'chat',text:'x'.repeat(241)});assert.equal(n.social.chat.length,1);
  for(let i=0;i<65;i++){n.later(2000);n.social.message('two',{type:'chat',text:`pesan ${i}`});}
  assert.equal(n.social.chat.length,60);assert.equal(n.social.chat.at(-1).text,'pesan 64');
});
test('only the invited friend may accept and expired invitations cannot join a room',()=>{
  const n=network();n.connect('one','Adi');n.connect('two','Mimi');n.connect('third','Other');n.friends();
  n.social.message('one',{type:'invite',target:n.social.profile('third').id});assert.equal(n.rooms.rooms.size,0);
  n.social.message('one',{type:'invite',target:n.social.profile('two').id});
  const invitation=n.packets.get('two')!.find(p=>p.type==='invitation').invitation;
  n.social.message('third',{type:'invite_accept',id:invitation.id});assert.equal(n.rooms.clients.get('third').room,null);
  n.later(61000);n.social.maintenance();n.social.message('two',{type:'invite_accept',id:invitation.id});assert.equal(n.rooms.clients.get('two').room,null);assert.equal(n.social.invitations.size,0);
});
test('removing a friend prevents old invitations and disconnect updates presence',()=>{
  const n=network();n.connect('one','Adi');n.connect('two','Mimi');n.friends();
  n.social.message('one',{type:'invite',target:n.social.profile('two').id});const inv=n.packets.get('two')!.find(p=>p.type==='invitation').invitation;
  n.social.message('two',{type:'friend_remove',target:n.social.profile('one').id});n.social.message('two',{type:'invite_accept',id:inv.id});assert.equal(n.rooms.clients.get('two').room,null);
  n.friends();n.rooms.disconnect('two');n.social.disconnect('two');assert.equal(n.social.snapshot('one').friends[0].online,false);
});
test('unauthenticated social actions and invalid stored profile relations are rejected',()=>{
  const n=network();n.social.connect('anonymous',()=>{});n.social.message('anonymous',{type:'chat',text:'hi'});assert.equal(n.social.chat.length,0);
  assert.throws(()=>new SocialHub(n.rooms,{state:{version:1,profiles:[{id:'x',name:'a'}]}}));
});
