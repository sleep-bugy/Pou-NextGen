import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { newSave, clamp, earn,isExhausted,enforceRest } from '../src/lib/model.ts';
import { rinseFoam } from '../src/lib/bath.ts';
import { gazeAt, roomPouGeometry } from '../src/lib/pou-geometry.ts';
import { GameAudio } from '../src/lib/audio.ts';
import { POTIONS } from '../src/lib/assets.ts';
import { consumePotion } from '../src/lib/experiments.ts';
import {care,favoriteFood} from '../src/lib/world.ts';

/** Exercise the handlers actually wired by App.svelte, without a browser socket. */
function handlers(environment: Record<string, unknown>) {
  const component = readFileSync(new URL('../src/App.svelte', import.meta.url), 'utf8');
  const script = component.match(/<script lang="ts">([\s\S]*?)<\/script>/)![1];
  const ast = ts.createSourceFile('App.ts', script, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const wanted = new Set(['requireRest','pet','feed','toggleSleep', 'usePotion', 'dragStart', 'dragMove', 'dragEnd', 'cancelDrag', 'lostDrag', 'positionShower', 'rinsePou', 'trackGaze']);
  const declarations = ast.statements.filter(node => ts.isFunctionDeclaration(node) && node.name && wanted.has(node.name.text)).map(node => node.getText(ast)).join('\n');
  const js = ts.transpileModule(declarations, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None } }).outputText;
  const scope = vm.createContext({isExhausted,care,favoriteFood,...environment});
  vm.runInContext(js, scope);
  return scope;
}

test('petting Pou retains the original vocal sounds requested by the user', () => {
  const played: string[] = [];
  class FakeAudio {
    src: string; currentTime = 0; volume = 0; preload = '';
    constructor(src: string) { this.src = src; }
    play() { played.push(this.src.split('/').at(-1)!); return Promise.resolve(); }
    pause() {}
  }
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'Audio');
  Object.defineProperty(globalThis, 'Audio', { configurable: true, value: FakeAudio });
  try {
    const save = newSave();
      // Check every original random branch, not only the first choice.
    for (const random of [0, 0.4, 0.99]) {
      const audio = new GameAudio();
      audio.catalog.sounds = { hu2: 'sounds/hu2.mp3', miei: 'sounds/miei.m4a', a7777: 'sounds/a7777.m4a', squish: 'sounds/squish.mp3' };
      audio.unlock();
      const scope = handlers({ save, eating: 0, cleanMode: false, drag: null, audio, commit: (fn: (s: typeof save) => void) => fn(save), clamp: (n: number) => Math.min(100, n), Math: Object.assign(Object.create(Math), { random: () => random }) });
      vm.runInContext('pet()', scope);
    }
    assert.deepEqual(played, ['hu2.mp3', 'miei.m4a', 'a7777.m4a']);
  } finally {
    if (previous) Object.defineProperty(globalThis, 'Audio', previous);
    else Reflect.deleteProperty(globalThis, 'Audio');
  }
});

test('exhausted Pou refuses food, soap, shower, ball and wake without spending stock',()=>{
  for(const action of ['feed()','toggleSleep()','dragStart(event,"food")','dragStart(event,"soap")','dragStart(event,"shower")','dragStart(event,"ball")']){
    const save=newSave();save.stats.energy=5;save.sleeping=true;save.exhausted=true;
    const messages:string[]=[];
    const scope=handlers({save,food:'apple',drag:null,cleanMode:false,rinse:false,water:null,
      notify:(message:string)=>messages.push(message),audio:{play(){},stopShower(){}},
      commit:(fn:(s:typeof save)=>void)=>{fn(save);enforceRest(save);},openShop(){throw new Error('must refuse instead of shopping');},
      event:{clientX:400,clientY:500,pointerId:1,button:0,currentTarget:{setPointerCapture(){throw new Error('must refuse before taking the pointer');}}},
    });
    vm.runInContext(action,scope);assert.equal(save.sleeping,true);assert.equal(save.food.apple,3);assert.equal(save.counters.fed,0);assert.equal(vm.runInContext('drag',scope),null);assert.match(messages[0],/terlalu lelah/);
  }
});
test('a shower already running cannot rinse an exhausted Pou',()=>{
  const scope=bathHandlers();vm.runInContext('save.stats.energy=5;save.exhausted=true;water={x:50,y:30};rinsePou(.5)',scope);
  assert.equal(vm.runInContext('save.stats.clean',scope),80);
});

test('dragging a purchased poison to the mouth drinks it immediately without opening the shelf',()=>{
  for(const id of ['poison','spin','drowsy','antidote','antidote-max','infinite','1']){
    const save=newSave();save.potions[id]=1;const menus:string[]=[],sounds:string[]=[];
    const scope=handlers({save,potion:POTIONS.find(p=>p.id===id),consumePotion,drag:null,eating:0,
      open:(name:string)=>menus.push(name),openShop:(name:string)=>menus.push(name),notify(){},
      audio:{play:(name:string)=>sounds.push(name)},commit:(fn:(s:typeof save)=>void)=>fn(save),
      playingField:{getBoundingClientRect:()=>({left:0,top:0,width:1366,height:615,right:1366})},
      start:{clientX:683,clientY:460,pointerId:1,button:0,currentTarget:{setPointerCapture(){}}},
      mouth:{clientX:683,clientY:344,pointerId:1},
    });
    vm.runInContext('dragStart(start,"potion");dragMove(mouth);dragEnd(mouth);lostDrag(mouth)',scope);
    assert.deepEqual(menus,[],`${id}: consuming stock should not redirect to a menu`);
    assert.equal(save.potions[id],0,`${id}: one bottle is consumed`);assert.deepEqual(sounds,['potion']);assert.ok(vm.runInContext('eating>Date.now()',scope));
    if(id==='spin')assert.ok(save.effects.spinUntil>Date.now());
    if(id==='poison')assert.equal(save.life.state,'poisoned');
  }
});

test('the room pointer handler follows clicks beside Pou without petting or feeding', () => {
  const save = newSave();
  const scope = handlers({ save, gaze:{x:0,y:0}, gazeAt, roomPouGeometry, playingField:{getBoundingClientRect:()=>({left:0,top:0,width:1366,height:615})} });
  vm.runInContext('trackGaze({clientX:20,clientY:300})',scope);
  assert.equal(vm.runInContext('gaze.x',scope),-1);
  vm.runInContext('trackGaze({clientX:1340,clientY:300})',scope);
  assert.equal(vm.runInContext('gaze.x',scope),1);
  assert.equal(save.counters.petted,0);
  assert.equal(save.counters.fed,0);
});

function bathHandlers() {
  const save = newSave();
  return handlers({
    save, food: 'apple', drag: null, cleanMode: false, rinse: false, water: null, washPointer: null,
    bubbles: [], bathActive: true, washRewardEligible: false, clamp, earn, rinseFoam,
    audio: { stopShower() {} }, notify() {},
    commit: (fn: (save: ReturnType<typeof newSave>) => void) => fn(save),
    playingField: { getBoundingClientRect: () => ({ left: 0, top: 0, width: 820, height: 1180, right: 820 }) },
    event: { clientX: 600, clientY: 900, pointerId: 1, button: 0, isPrimary: true, currentTarget: { setPointerCapture() {} } },
  });
}

test('a shower tap starts continuous rinsing; the next tap stops it', () => {
  const scope = bathHandlers();
  vm.runInContext('dragStart(event,"shower");dragEnd(event)', scope);
  assert.equal(vm.runInContext('cleanMode && rinse && water !== null', scope), true);
  vm.runInContext('lostDrag(event)', scope);
  assert.equal(vm.runInContext('water !== null', scope), true, 'normal release of pointer capture must not switch off the shower');
  vm.runInContext('rinsePou(0.25)', scope);
  assert.equal(vm.runInContext('save.stats.clean', scope), 83);
  vm.runInContext('dragStart(event,"shower");dragEnd(event)', scope);
  const before = vm.runInContext('save.stats.clean', scope);
  vm.runInContext('rinsePou(0.25)', scope);
  assert.equal(vm.runInContext('water', scope), null);
  assert.equal(vm.runInContext('save.stats.clean', scope), before);
});

test('canceling a shower gesture stops water and ignores a later pointer release', () => {
  const scope = bathHandlers();
  vm.runInContext('dragStart(event,"shower"); cancelDrag(event); dragEnd(event)', scope);
  assert.equal(vm.runInContext('water', scope), null);
  assert.equal(vm.runInContext('drag', scope), null);
  assert.equal(vm.runInContext('cleanMode', scope), false);
});

test('one bath gives one completion reward even as passive cleanliness decay resumes', () => {
  const scope = bathHandlers();
  vm.runInContext('save.stats.clean=94; dragStart(event,"shower");dragEnd(event);rinsePou(0.5)', scope);
  for (let i = 0; i < 20; i++) vm.runInContext('save.stats.clean=99.999;rinsePou(0.25)', scope);
  assert.equal(vm.runInContext('save.counters.washed', scope), 1);
  assert.equal(vm.runInContext('save.coins', scope), 205);
});

test('a hidden, sleeping or paused bath cannot advance cleanliness', () => {
  const scope = bathHandlers();
  vm.runInContext('dragStart(event,"shower");dragEnd(event);bathActive=false;rinsePou(0.25)', scope);
  assert.equal(vm.runInContext('save.stats.clean', scope), 80);
});

test('a slow continuous tool drag never turns into a tap on release', () => {
  const save = newSave();
  const scope = handlers({
    save, food: 'apple', drag: null, cleanMode: false, rinse: false,
    playingField: { getBoundingClientRect: () => ({ left: 0, top: 0, width: 820, height: 1180, right: 820 }) },
    cleanAt: () => {}, notify: () => {}, openShop: () => {},
    start: { clientX: 350, clientY: 950, pointerId: 1, currentTarget: { setPointerCapture() {} } },
  });
  vm.runInContext('dragStart(start, "soap")', scope);
  for (let x = 351; x <= 365; x++) vm.runInContext(`dragMove({ clientX: ${x}, clientY: 950, pointerId: 1 })`, scope);
  assert.equal(vm.runInContext('drag.moved', scope), true, 'movement is measured from pointerdown, not the previous event');
  vm.runInContext('dragEnd({clientX:365,clientY:950,pointerId:1})', scope);
  assert.equal(vm.runInContext('cleanMode', scope), false, 'releasing a dragged soap must not switch the tap tool mode');
});
