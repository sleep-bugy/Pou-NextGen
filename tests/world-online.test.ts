import test from 'node:test';
import assert from 'node:assert/strict';
import {SocialHub} from '../server/social.mjs';
import {RoomHub} from '../server/rooms.mjs';
import {WorldHub} from '../server/world.mjs';
import {freshWorld} from '../src/lib/world-state.ts';

function net(){
  let now=10000,n=0;const packets=new Map<string,any[]>(),rooms=new RoomHub({now:()=>now});
  const social=new SocialHub(rooms,{now:()=>now,id:()=>`profile-${++n}`,token:()=>(++n).toString(16).padStart(8,'0').padEnd(64,'a')});
  const world=new WorldHub(social,rooms,{now:()=>now,id:()=>`reward-${++n}`});rooms.onComplete=(room:any)=>world.finish(room);
  for(const id of ['one','two','third']){packets.set(id,[]);const send=(p:any)=>packets.get(id)!.push(p);rooms.connect(id,send);social.connect(id,send);social.message(id,{type:'hello',name:id});}
  social.message('one',{type:'friend_request',code:social.profile('two').code});social.message('two',{type:'friend_accept',target:social.profile('one').id});
  return {world,rooms,social,packets,later:(ms:number)=>now+=ms};
}
test('shared garden waits for server time, rewards contributors once and retains crops after restart',()=>{
  const n=net(),owner=n.social.profile('one'),friend=n.social.profile('two');
  n.world.message('one',{type:'garden_plant',plot:0,crop:'carrot'});
  n.world.message('two',{type:'garden_water',target:owner.id,plot:0});assert.equal(owner.features.garden[0].contributors.length,2);
  n.world.message('two',{type:'garden_water',target:owner.id,plot:0});assert.equal(owner.features.garden[0].contributors.length,2);
  n.world.message('one',{type:'garden_harvest',plot:0});assert.equal(owner.features.metrics.harvest,0);
  const restored=new SocialHub(n.rooms,{state:n.social.dump()});assert.equal(restored.profiles.get(owner.id).features.garden[0].crop,'carrot');
  n.later(100000);n.world.message('two',{type:'garden_harvest',target:owner.id,plot:0});
  assert.equal(owner.features.wallet.carrot,2);assert.equal(friend.features.wallet.carrot,2);assert.equal(owner.features.deliveries.length,1);
  n.world.message('one',{type:'garden_harvest',plot:0});assert.equal(owner.features.metrics.harvest,1);assert.equal(owner.features.deliveries.length,1);
});
test('cooking exchanges exact server inventory and delivery acknowledgements persist',()=>{
  const n=net(),p=n.social.profile('one');p.features.wallet={carrot:2,wheat:1,berry:0};
  n.world.message('one',{type:'garden_cook',recipe:'salad'});assert.equal(p.features.wallet.carrot,0);assert.equal(p.features.deliveries[0].food.vegetable_soup,2);
  n.world.message('one',{type:'garden_cook',recipe:'salad'});assert.equal(p.features.deliveries.length,1);
  n.world.message('one',{type:'reward_ack',id:p.features.deliveries[0].id});assert.equal(p.features.deliveries.length,0);
});
test('only friends can tend a garden, visit a home and leave one changeable reaction',()=>{
  const n=net(),owner=n.social.profile('one');const home=freshWorld().home;home.owned=['sofa'];home.placements=[{item:'sofa',room:'Bedroom',x:42,y:60}];
  n.world.message('one',{type:'home_publish',home,body:'#f3a4b5',eyes:'#111111'});
  n.world.message('two',{type:'home_visit',target:owner.id});assert.equal(n.packets.get('two')!.at(-1).home.home.placements[0].x,42);
  n.world.message('third',{type:'home_visit',target:owner.id});assert.equal(n.packets.get('third')!.at(-1).type,'error');
  n.world.message('third',{type:'garden_plant',target:owner.id,plot:0,crop:'wheat'});assert.equal(owner.features.garden[0].crop,'');
  n.world.message('two',{type:'home_react',target:owner.id,reaction:'heart'});n.world.message('two',{type:'home_react',target:owner.id,reaction:'wow'});assert.equal(Object.keys(owner.features.reactions).length,1);assert.equal(Object.values(owner.features.reactions)[0],'wow');
});
test('leaderboards rank server results globally or among friends and ignore client score fields',()=>{
  const n=net();n.social.profile('one').features.metrics.food=10;n.social.profile('two').features.metrics.food=20;n.social.profile('third').features.metrics.food=40;
  n.world.message('one',{type:'leaderboard',category:'food',scope:'friends',score:999999});let board=n.packets.get('one')!.at(-1);assert.equal(board.rows.length,2);assert.equal(board.rows[0].name,'two');assert.equal(board.self.rank,2);
  n.world.message('one',{type:'leaderboard',category:'food',scope:'global'});board=n.packets.get('one')!.at(-1);assert.equal(board.rows[0].name,'third');assert.equal(board.self.rank,3);
});
test('finishing a co-op run grants one rare reward per profile and cannot pay twice',()=>{
  const n=net();const room={mode:'adventure',matchId:'match-coop',success:true,teamScore:8,remaining:100,players:new Map([['one',{id:'one'}],['two',{id:'two'}]])};
  n.world.finish(room);n.world.finish(room);for(const id of ['one','two']){const p=n.social.profile(id);assert.equal(p.features.metrics.adventure,180);assert.equal(p.features.deliveries.length,1);assert.deepEqual(p.features.deliveries[0].owned,['rewards/explorer-hat.svg']);}
});
