import test from 'node:test';
import assert from 'node:assert/strict';
import {RoomHub} from '../server/rooms.mjs';
import {ADVENTURE_PLATFORMS,adventureInput,stepAdventure} from '../server/adventure.mjs';

function run(){let now=10000,ends=0;const hub=new RoomHub({now:()=>now,onComplete:()=>ends++});for(const id of ['one','two'])hub.connect(id,()=>{});hub.message('one',{type:'create',name:'One',mode:'adventure'});const room:any=[...hub.rooms.values()][0];hub.message('two',{type:'join',name:'Two',code:room.code});hub.message('one',{type:'start'});return {hub,room,tick:()=>{now+=50;hub.tick(.05);},ends:()=>ends};}
test('two players can complete the actual co-op course with legal movement and jumps',()=>{
  const a=run();for(let i=0;i<3000&&a.room.phase!=='finished';i++){
    if(a.room.phase==='playing')for(const p of a.room.players.values()){
      const platform=ADVENTURE_PLATFORMS.find(t=>p.x>=t.x&&p.x<=t.x+t.w);
      const jump=p.grounded&&platform&&platform.x+platform.w<2000&&platform.x+platform.w-p.x<85;
      a.hub.message(p.id,{type:'input',dx:p.x<1960?1:0,jump:!!jump});
    }
    a.tick();
  }
  assert.equal(a.room.phase,'finished');assert.equal(a.room.success,true);assert.ok(a.room.teamScore>=5);assert.equal(a.ends(),1);
  for(let i=0;i<10;i++)a.tick();assert.equal(a.ends(),1);
});
test('a teammate can revive a fallen Pou, while jumping cannot be repeated in midair',()=>{
  const a=run();const [one,two]=[...a.room.players.values()];one.x=310;one.y=462;one.grounded=true;two.x=380;two.y=540;two.down=true;two.downFor=2;
  adventureInput(a.room,one,{help:true});assert.equal(two.down,false);assert.equal(two.x,one.x);assert.equal(one.helps,1);
  adventureInput(a.room,one,{jump:true});const vy=one.vy;one.vy+=100;adventureInput(a.room,one,{jump:true});assert.equal(one.vy,vy+100);
});
test('shared gems are collected once and timeout does not declare a successful adventure',()=>{
  const a=run();for(const p of a.room.players.values()){p.x=150;p.y=430;p.vy=0;p.down=false;}a.room.items=[{id:'one-gem',x:150,y:430,kind:0}];
  stepAdventure(a.room,.01);assert.equal(a.room.teamScore,1);assert.equal(a.room.items.length,0);
  a.room.phase='playing';a.room.remaining=.01;a.tick();assert.equal(a.room.phase,'finished');assert.equal(a.room.success,false);
});
test('losing the second co-op player returns to the lobby instead of trapping one player',()=>{
  const a=run();for(let i=0;i<65;i++)a.tick();assert.equal(a.room.phase,'playing');a.hub.disconnect('two');assert.equal(a.room.phase,'lobby');assert.equal(a.ends(),0);
});
