import test from 'node:test';
import assert from 'node:assert/strict';
import { arena } from './helpers/arena.ts';
import { SHOT_GRAVITY } from '../src/lib/mini-physics.ts';

test('every initial Sky Jump platform stays within a reachable jump across screen sizes',()=>{
  for(const [w,h] of [[1366,530],[390,720],[820,1000]]) for(let seed=1;seed<=20;seed++){
    let state=seed;
    const a=arena('sky-jump',w,h,()=>((state=state*16807%2147483647)/2147483647));
    const platforms=[...a.engine.items].sort((p,q)=>q.y-p.y);
    for(let i=1;i<platforms.length;i++){
      const from=platforms[i-1],to=platforms[i],rise=from.y-to.y;
      const time=(420+Math.sqrt(420**2-2*700*rise))/700;
      const reach=Math.max(320,a.engine.W*.67)*time;
      assert.ok(Math.abs(to.x+to.w/2-from.x-from.w/2)<=reach*.8,`unreachable platform: ${w}x${h}, seed ${seed}`);
    }
    a.engine.destroy();
  }
});

test('a real Hoops gesture can score on laptop, phone and iPad sized arenas',()=>{
  for(const [w,h] of [[1366,530],[390,720],[820,1000]]){
    const a=arena('hoops',w,h),p=a.engine.player,scale=h/680;
    const dy=100,up=380+dy*5.5,rise=p.y-285;
    const time=(up+Math.sqrt(up**2-2*SHOT_GRAVITY*rise))/SHOT_GRAVITY;
    const vx=(a.engine.W*.78-p.x)/time;
    const dx=vx/(4*Math.max(1,Math.sqrt(a.engine.W/480)));
    const event=(x:number,y:number)=>({clientX:x*scale,clientY:y*scale,pointerId:1,preventDefault(){}});
    a.events.get('pointerdown')!(event(p.x,p.y));a.events.get('pointermove')!(event(p.x-dx,p.y+dy));a.events.get('pointerup')!(event(p.x-dx,p.y+dy));
    for(let i=0;i<300&&!a.engine.score;i++)a.engine.update(1/120);
    assert.equal(a.engine.score,3,`${w}x${h}: a correctly aimed shot must score`);
    assert.ok(a.engine.effects.some((e:{text:string})=>e.text==='+3'));
    a.engine.destroy();
  }
});

test('Sky Jump can be played through multiple real bounces without teleporting',()=>{
  let seed=19;const a=arena('sky-jump',1366,530,()=>((seed=seed*16807%2147483647)/2147483647));
  let target:any=null;
  for(let i=0;i<2400&&!a.engine.finished;i++){
    if(!target)target=[...a.engine.items].filter(p=>p.y<a.engine.player.y+9).sort((p,q)=>q.y-p.y)[0];
    if(target)a.events.get('pointermove')!({clientX:(target.x+target.w/2)*530/680,clientY:200});
    const old=a.engine.player.v;a.engine.update(1/120);
    if(old>0&&a.engine.player.v<0)target=null;
  }
  assert.equal(a.engine.finished,false);assert.ok(a.engine.score>100);a.engine.destroy();
});

test('Cliff Jump does not permit a second jump while already in the air',()=>{
  const a=arena('cliff-jump');a.engine.player.y=517;a.engine.player.v=0;a.engine.action();
  const velocity=a.engine.player.v;a.engine.update(.05);a.engine.action();
  assert.ok(a.engine.player.v>velocity,'gravity must continue instead of resetting velocity');a.engine.destroy();
});

test('Cliff Jump keeps falling after leaving a gap instead of snapping back onto the ground',()=>{
  const a=arena('cliff-jump');a.engine.player.y=518;a.engine.player.v=40;
  a.engine.items=[{x:a.engine.player.x-35,y:510,type:1,w:70}];
  let previous=a.engine.player.y;
  for(let i=0;i<120&&!a.engine.finished;i++){
    a.engine.update(1/120);assert.ok(a.engine.player.y>=previous,'a falling Pou must never be pulled back up to the floor');previous=a.engine.player.y;
  }
  assert.equal(a.engine.finished,true);a.engine.destroy();
});

test('puzzle rounds always contain an available next action',()=>{
  const sad=arena('sad-tap');assert.ok(sad.engine.board.includes(0));sad.engine.destroy();
  const match=arena('match-tap');match.engine.board=Array.from({length:36},(_,i)=>(i%12+Math.floor(i/12))%4);match.engine.ensureMatch();
  const columns=match.engine.grid().columns;
  assert.ok(match.engine.board.some((_:number,i:number)=>match.helpers.connectedGroup(match.engine.board,i,columns).length>=3));match.engine.destroy();
  const swap=arena('food-swap');assert.equal(swap.engine.findMatches().length,0);assert.equal(swap.engine.hasSwap(),true);swap.engine.destroy();
});

test('Hoops can reach the rim using a pull fully contained inside the visible screen',()=>{
  const a=arena('hoops');
  const scale=a.rect.height/680, p=a.engine.player;
  const event=(x:number,y:number)=>({clientX:x,clientY:y,pointerId:1,preventDefault(){}});
  a.events.get('pointerdown')!(event(p.x*scale,p.y*scale));
  a.events.get('pointermove')!(event(p.x*scale-80,a.rect.height-10));
  a.events.get('pointerup')!(event(p.x*scale-80,a.rect.height-10));
  assert.ok(p.y-p.v**2/(2*900)<285,'a valid on-screen pull must have enough vertical energy');
  a.engine.destroy();
});

test('Hoops draws an aiming trajectory while a ball is pulled',()=>{
  const a=arena('hoops'),scale=a.rect.height/680,p=a.engine.player;
  const event=(x:number,y:number)=>({clientX:x,clientY:y,pointerId:1,preventDefault(){}});
  a.events.get('pointerdown')!(event(p.x*scale,p.y*scale));
  a.events.get('pointermove')!(event(p.x*scale-60,p.y*scale+65));
  a.engine.draw();
  assert.ok(a.paths.filter(p=>p.method==='arc').length>=8,'aim dots must be painted before release');
  a.engine.destroy();
});

test('dragging empty court space cannot launch the Hoops ball',()=>{
  const a=arena('hoops');
  a.events.get('pointerdown')!({clientX:10,clientY:10,pointerId:1,preventDefault(){}});
  a.events.get('pointerup')!({clientX:100,clientY:100,pointerId:1,preventDefault(){}});
  assert.equal(a.engine.shot,false);
  a.engine.destroy();
});


test('Sky Jump draws collectible coins and collects each coin only once while jumping',()=>{
  const a=arena('sky-jump',390,720,()=>0.2);
  const platform=a.engine.items.find((p:any)=>p.coin);
  assert.ok(platform);
  a.engine.draw();
  assert.ok(a.sprites.some((sprite:any)=>sprite.path==='coin/coin_sm.png'));
  a.engine.player.x=platform.x+platform.w/2;
  a.engine.player.y=platform.y-30;
  a.engine.player.v=100;
  a.engine.update(1/60);
  assert.equal(a.engine.collectedCoins,1);
  assert.equal(platform.coin,false);
  a.engine.update(1/120);
  assert.equal(a.engine.collectedCoins,1);
  a.engine.destroy();
});

test('Sky Jump limits horizontal gaps even on very wide screens',()=>{
  const a=arena('sky-jump',1920,400,()=>0.99);
  for(let i=1;i<a.engine.items.length;i++){
    const previous=a.engine.items[i-1],current=a.engine.items[i];
    assert.ok(Math.abs(current.x+current.w/2-previous.x-previous.w/2)<=200.001);
  }
  a.engine.destroy();
});

test('Jet Pou collects normal and bonus coins only once',()=>{
  const a=arena('jet-pou');
  a.engine.jetCoins=[{x:a.engine.player.x+2,y:a.engine.player.y,bonus:false}];
  a.engine.update(.01);assert.equal(a.engine.collectedCoins,1);
  a.engine.jetCoins=[{x:a.engine.player.x+2,y:a.engine.player.y,bonus:true}];
  a.engine.update(.01);assert.equal(a.engine.collectedCoins,6);
  a.engine.update(.01);assert.equal(a.engine.collectedCoins,6);assert.deepEqual(a.coinAwards,[1,5]);a.engine.destroy();
});
