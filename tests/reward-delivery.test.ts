import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import {newSave,parseSave,advance} from '../src/lib/model.ts';
import {claimReward} from '../src/lib/world.ts';

test('the actual app saves server loot before acknowledgement and retries storage failure without double coins',async()=>{
  const script=readFileSync(new URL('../src/App.svelte',import.meta.url),'utf8').match(/<script lang="ts">([\s\S]*?)<\/script>/)![1];
  const ast=ts.createSourceFile('App.ts',script,ts.ScriptTarget.Latest,true,ts.ScriptKind.TS);
  const fn=ast.statements.find(node=>ts.isFunctionDeclaration(node)&&node.name?.text==='drainRewards')!;
  const code=ts.transpileModule(fn.getText(ast),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.None}}).outputText;
  let writes=0,acks=0,release:()=>void=()=>{},fail=false;
  const reward={id:'server-loot-1',label:'Co-op',coins:50,xp:25,food:{apple:2},owned:[]};
  const session={status:'connected',rewards:[reward],acknowledgeReward(_id:string){acks++;this.rewards=[];return true;}};
  const context=vm.createContext({ready:true,drainingRewards:false,nextRewardAttempt:0,warning:'',save:newSave(),parseSave,advance,claimReward,multiplayer:session,$state:{snapshot:(v:any)=>v},notify(){},saveProgress:()=>{writes++;if(fail)return Promise.reject(new Error('storage'));return new Promise<void>(resolve=>release=resolve);}});
  vm.runInContext(code,context);
  const pending=vm.runInContext('drainRewards()',context);assert.equal(writes,1);assert.equal(acks,0);release();await pending;assert.equal(acks,1);assert.equal(context.save.coins,250);
  session.rewards=[{...reward,id:'server-loot-2'}];fail=true;await vm.runInContext('drainRewards()',context);assert.equal(acks,1);assert.equal(context.save.coins,300);
  fail=false;context.nextRewardAttempt=0;const retry=vm.runInContext('drainRewards()',context);release();await retry;assert.equal(acks,2);assert.equal(context.save.coins,300);
});
