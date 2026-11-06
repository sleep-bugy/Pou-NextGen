import test from 'node:test';
import assert from 'node:assert/strict';
import { RoomHub } from '../server/rooms.mjs';

function lobby(){
  let id=0,now=1000;const messages=new Map<string,any[]>();
  const hub=new RoomHub({random:()=>.3,now:()=>now,id:()=>`match-${++id}`});
  const connect=(name:string)=>{messages.set(name,[]);hub.connect(name,(packet:any)=>messages.get(name)!.push(packet));};
  connect('one');connect('two');hub.message('one',{type:'create',name:'Pou One'});
  const code=[...hub.rooms.keys()][0];hub.message('two',{type:'join',name:'Pou Two',code});
  return {hub,code,messages,connect,tick:(dt=.05)=>{now+=dt*1000;hub.tick(dt);}};
}
test('two simulated room clients see the same lobby and only its host can start',()=>{
  const a=lobby();assert.equal(a.hub.rooms.get(a.code).players.size,2);
  a.hub.message('two',{type:'start'});assert.equal(a.hub.rooms.get(a.code).phase,'lobby');assert.equal(a.messages.get('two')!.at(-1).type,'error');
  a.hub.message('one',{type:'start'});assert.equal(a.hub.rooms.get(a.code).phase,'countdown');
  for(let i=0;i<65;i++)a.tick();assert.equal(a.hub.rooms.get(a.code).phase,'playing');
});
test('server calculates collected food and ignores client attempts to set a score',()=>{
  const a=lobby(),room=a.hub.rooms.get(a.code);room.phase='playing';room.matchId='round1';
  const player=room.players.get('one');player.x=player.targetX=.5;room.items.push({id:'food1',x:.5,y:.83,kind:0});a.tick(.1);assert.equal(player.score,1);
  a.hub.message('one',{type:'input',x:9000,score:99999});a.hub.message('one',{type:'score',score:99999});assert.equal(player.score,1);assert.equal(player.targetX,.5);
  const first=a.messages.get('one')!.filter(p=>p.type==='state').at(-1),second=a.messages.get('two')!.filter(p=>p.type==='state').at(-1);assert.deepEqual(first,second);
});
test('a match ends once, can restart, and disconnection transfers room ownership',()=>{
  const a=lobby();a.hub.message('one',{type:'start'});for(let i=0;i<680;i++)a.tick(.1);
  const room=a.hub.rooms.get(a.code);assert.equal(room.phase,'finished');const match=room.matchId;a.tick(.1);assert.equal(room.matchId,match);
  a.hub.message('one',{type:'start'});assert.notEqual(room.matchId,match);assert.equal(room.phase,'countdown');
  a.hub.disconnect('one');assert.equal(room.host,'two');a.hub.disconnect('two');assert.equal(a.hub.rooms.size,0);
});
test('joining the same room twice does not delete it and a fifth player cannot enter',()=>{
  const a=lobby();a.hub.message('one',{type:'join',code:a.code,name:'Pou One'});assert.equal(a.hub.rooms.size,1);assert.equal(a.hub.rooms.get(a.code).players.size,2);
  for(const id of ['three','four','five']){a.connect(id);a.hub.message(id,{type:'join',code:a.code,name:id});}
  assert.equal(a.hub.rooms.get(a.code).players.size,4);assert.equal(a.messages.get('five')!.at(-1).type,'error');
});
