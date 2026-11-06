import test from 'node:test';
import assert from 'node:assert/strict';
import { arena } from './helpers/arena.ts';
import { responsiveGrid } from '../src/lib/viewport.ts';

function tap(a:ReturnType<typeof arena>,index:number,grid=a.engine.grid()){
  a.engine.tap(grid.left+(index%grid.columns+.5)*grid.cell,grid.top+(Math.floor(index/grid.columns)+.5)*grid.cell);
}
test('Memory can complete a whole matched board and pays once on completion',()=>{
  const a=arena('memory');
  for(let value=0;value<8;value++){
    const indices=a.engine.board.flatMap((v:number,i:number)=>v===value?[i]:[]);
    tap(a,indices[0]);tap(a,indices[1]);a.engine.update(1);
  }
  assert.equal(a.engine.finished,true);assert.equal(a.engine.score,80);a.engine.destroy();
});
test('Color Tap and Sad Tap score through multiple playable rounds',()=>{
  const color=arena('color-tap');
  for(let i=0;i<color.engine.board.length;i++)for(let n=0;n<4&&color.engine.board[i]!==color.engine.targetColor;n++)tap(color,i);
  assert.ok(color.engine.score>=36);color.engine.destroy();
  const sad=arena('sad-tap');for(let round=0;round<3;round++){
    const indices=sad.engine.board.flatMap((v:number,i:number)=>v===0?[i]:[]);assert.ok(indices.length);indices.forEach((i:number)=>tap(sad,i));
  }
  assert.ok(sad.engine.score>2);sad.engine.destroy();
});
test('Match Tap removes a real connected group; Food Swap resolves a legal match',()=>{
  const match=arena('match-tap'),columns=match.engine.grid().columns;
  const index=match.engine.board.findIndex((_:number,i:number)=>match.helpers.connectedGroup(match.engine.board,i,columns).length>=3);
  tap(match,index);assert.ok(match.engine.score>=3);match.engine.destroy();
  const swap=arena('food-swap'),board=swap.engine.board,cols=swap.engine.grid().columns;
  let pair:number[]=[];
  for(let i=0;i<board.length&&!pair.length;i++)for(const j of [i%cols<cols-1?i+1:-1,i+cols<board.length?i+cols:-1]){
    if(j<0)continue;[board[i],board[j]]=[board[j],board[i]];const valid=swap.engine.findMatches().length>0;[board[i],board[j]]=[board[j],board[i]];if(valid){pair=[i,j];break;}
  }
  assert.equal(pair.length,2);tap(swap,pair[0]);tap(swap,pair[1]);assert.ok(swap.engine.score>=3);assert.equal(swap.engine.hasSwap(),true);swap.engine.destroy();
});
test('Tic Tac Pou can finish a draw and Four Pous recognizes a winning drop',()=>{
  const tic=arena('tic-tac-pou'),grid=responsiveGrid(tic.engine.W,680,9,160,3);
  for(const i of [0,8,1,6,5])tap(tic,i,grid);
  assert.equal(tic.engine.finished,true);assert.equal(tic.engine.score,10);tic.engine.destroy();
  const four=arena('four-pous');four.engine.board[35]=0;four.engine.board[36]=0;four.engine.board[37]=0;
  tap(four,3,responsiveGrid(four.engine.W,680,42,150,7));assert.equal(four.engine.finished,true);assert.ok(four.engine.score>=30);four.engine.destroy();
});
test('Find Pou and Pou Sounds accept the displayed answer and advance the round',()=>{
  const cups=arena('find-pou');for(let i=0;i<1500&&cups.engine.swaps<4;i++)cups.engine.update(.01);
  cups.engine.tap((cups.engine.cups[0]+.5)*cups.engine.W/3,400);assert.equal(cups.engine.score,5);cups.engine.destroy();
  const sounds=arena('pou-sounds');for(let i=0;i<300;i++)sounds.engine.update(.01);
  assert.equal(sounds.engine.showing,false);tap(sounds,sounds.engine.sequence[0],responsiveGrid(sounds.engine.W,680,4,160));assert.equal(sounds.engine.score,1);assert.equal(sounds.engine.sequence.length,2);sounds.engine.destroy();
});
test('Food Drop collects food once and a harmful object removes exactly one life',()=>{
  const a=arena('food-drop');a.engine.items=[{x:a.engine.player.x,y:529,v:140,type:0}];a.engine.update(.02);
  assert.equal(a.engine.score,1);a.engine.update(.02);assert.equal(a.engine.score,1);
  a.engine.items=[{x:a.engine.player.x,y:529,v:140,type:8}];a.engine.update(.02);assert.equal(a.engine.lives,2);a.engine.destroy();
});
test('Goal accepts a real upward gesture and can score past the moving keeper',()=>{
  for(const [width,height] of [[390,720],[1366,530],[820,1000]]){
    const a=arena('goal',width,height),p=a.engine.player,s=height/680;
    const event=(x:number,y:number)=>({clientX:x*s,clientY:y*s,pointerId:1,preventDefault(){}});
    a.events.get('pointerdown')!(event(p.x,p.y));a.events.get('pointerup')!(event(p.x,p.y-250));
    for(let i=0;i<200&&a.engine.shot;i++)a.engine.update(.01);
    assert.equal(a.engine.score,1,`${width}: a shot into the goal away from the keeper must score`);a.engine.destroy();
  }
});
test('Free Fall can survive continuous steering through the gaps',()=>{
  const a=arena('free-fall');
  for(let i=0;i<2000&&!a.engine.finished;i++){
    const gap=[...a.engine.items].filter(p=>p.y>=a.engine.player.y+20).sort((p,q)=>p.y-q.y)[0];
    if(gap)a.engine.moveTarget=gap.x+gap.w/2;
    a.engine.update(.01);
  }
  assert.equal(a.engine.finished,false);assert.ok(a.engine.score>=59);a.engine.destroy();
});

test('Jet Pou can fly through successive generated pipe openings',()=>{
  const a=arena('jet-pou',1366,530,()=>.58);
  for(let i=0;i<2400&&!a.engine.finished;i++){
    if(a.engine.player.y>300&&a.engine.player.v>0)a.engine.action();
    a.engine.update(1/120);
  }
  assert.equal(a.engine.finished,false);assert.ok(a.engine.score>=3);a.engine.destroy();
});
test('Cliff Jump can jump over generated gaps and obstacles without a second midair jump',()=>{
  for(const rng of [.3,.97]){
    const a=arena('cliff-jump',1366,530,()=>rng);
    for(let i=0;i<2400&&!a.engine.finished;i++){
      const next=[...a.engine.items].filter(item=>item.x>=a.engine.player.x).sort((p,q)=>p.x-q.x)[0];
      const speed=(220+a.engine.elapsed*2)*Math.max(1,Math.sqrt(a.engine.W/480));
      if(next&&next.x-a.engine.player.x<speed*.22)a.engine.action();
      a.engine.update(1/120);
    }
    assert.equal(a.engine.finished,false,`type ${rng<.5?'obstacle':'gap'}`);assert.ok(a.engine.score>=79);a.engine.destroy();
  }
});
