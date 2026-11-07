import test from 'node:test';
import assert from 'node:assert/strict';
import { GameAudio } from '../src/lib/audio.ts';

function withAudio(run: (tracks: FakeAudio[]) => void) {
  const tracks: FakeAudio[] = [];
  class TrackedAudio extends FakeAudio { constructor(src: string) { super(src); tracks.push(this); } }
  const old = Object.getOwnPropertyDescriptor(globalThis, 'Audio');
  Object.defineProperty(globalThis, 'Audio', { configurable: true, value: TrackedAudio });
  try { run(tracks); }
  finally { if (old) Object.defineProperty(globalThis, 'Audio', old); else Reflect.deleteProperty(globalThis, 'Audio'); }
}
class FakeAudio {
  src: string; currentTime = 0; volume = 0; preload = ''; plays = 0; paused = true;
  constructor(src: string) { this.src = src; }
  play() { this.plays++; this.paused = false; return Promise.resolve(); }
  pause() { this.paused = true; }
}
const catalog = { images: {}, sounds: { hu2: 'sounds/hu2.mp3', potion: 'sounds/potion.m4a' } };

test('muting effects stops the current clip and prevents new clips from playing', () => withAudio(tracks => {
  const audio = new GameAudio(); audio.catalog = catalog; audio.unlock();
  audio.play('hu2'); audio.setSound(false);
  assert.equal(tracks[0].paused, true);
  audio.play('potion');
  assert.equal(tracks.length, 1);
}));

test('leaving a game or clearing music cannot restart its old track on resume',()=>withAudio(tracks=>{
  const audio=new GameAudio();audio.catalog={images:{},sounds:{music:'sounds/music.m4a'}};audio.unlock();
  audio.setMusic('music');assert.equal(tracks[0].plays,1);
  audio.setMusic('');audio.resume();assert.equal(tracks[0].plays,1);assert.equal(tracks[0].paused,true);
  audio.setMusic('music');assert.equal(tracks[1].plays,1);
  audio.stop();audio.resume();assert.equal(tracks[1].plays,1);assert.equal(tracks[1].paused,true);
}));

test('stopping minigame music on game over preserves active game over sfx', () => withAudio(tracks => {
  const audio = new GameAudio();
  audio.catalog = { images: {}, sounds: { music: 'sounds/music.m4a', game_over: 'sounds/game_over.m4a' } };
  audio.unlock();
  audio.setMusic('music');
  assert.equal(tracks[0].plays, 1);
  audio.play('game_over');
  audio.setMusic('');
  assert.equal(tracks[0].paused, true);
  const sfx = tracks.find(t => t.src.includes('game_over'));
  assert.ok(sfx, 'game_over sfx must be instantiated');
  assert.equal(sfx.paused, false, 'game_over sfx must not be paused by music stoppage');
}));

test('shower audio starts once, stops on pause/mute, and can start again', () => {
  const sources: { stopped: boolean; disconnected: boolean; start: () => void; stop: () => void; connect: () => void; disconnect: () => void }[] = [];
  const node = () => ({ stopped: false, disconnected: false, start() {}, stop() { this.stopped = true; }, connect() {}, disconnect() { this.disconnected = true; } });
  class FakeContext {
    sampleRate = 120; currentTime = 0; destination = {};
    resume() { return Promise.resolve(); }
    createBuffer() { return { getChannelData: () => new Float32Array(240) }; }
    createBufferSource() { const source = node(); sources.push(source); return source; }
    createBiquadFilter() { return { ...node(), frequency: { value: 0 }, type: '' }; }
    createGain() { return { ...node(), gain: { setValueAtTime() {}, linearRampToValueAtTime() {} } }; }
  }
  const old = Object.getOwnPropertyDescriptor(globalThis, 'AudioContext');
  Object.defineProperty(globalThis, 'AudioContext', { configurable: true, value: FakeContext });
  try {
    const audio = new GameAudio(); audio.unlock();
    audio.startShower(); audio.startShower();
    assert.equal(sources.length, 1);
    audio.pause(); assert.equal(sources[0].stopped, true); assert.equal(sources[0].disconnected, true);
    audio.startShower(); assert.equal(sources.length, 2);
    audio.setSound(false); assert.equal(sources[1].stopped, true);
    audio.startShower(); assert.equal(sources.length, 2);
  } finally { if (old) Object.defineProperty(globalThis, 'AudioContext', old); else Reflect.deleteProperty(globalThis, 'AudioContext'); }
});

test('sleep makes gentle repeating breath noise only after interaction and obeys pause/mute',()=>{
  const sources:any[]=[];
  const node=()=>({stopped:false,disconnect(){},connect(){},start(){},stop(){this.stopped=true;}});
  class Context{
    sampleRate=8000;currentTime=0;destination={};resume(){return Promise.resolve();}
    createBuffer(_channels:number,length:number){const data=new Float32Array(length);return {getChannelData:()=>data};}
    createBufferSource(){const source={...node(),buffer:null as any,loop:false};sources.push(source);return source;}
    createGain(){return {...node(),gain:{setValueAtTime(){}}};}
  }
  const old=Object.getOwnPropertyDescriptor(globalThis,'AudioContext');
  Object.defineProperty(globalThis,'AudioContext',{configurable:true,value:Context});
  try{
    const audio=new GameAudio();audio.startSnore();assert.equal(sources.length,0);
    audio.unlock();audio.startSnore();audio.startSnore();assert.equal(sources.length,1);assert.equal(sources[0].loop,true);
    const data=sources[0].buffer.getChannelData(0);assert.ok(data.some((n:number)=>Math.abs(n)>.1));
    assert.ok(data.slice(8000*4).every((n:number)=>n===0),'a breath has a quiet interval');
    audio.pause();assert.equal(sources[0].stopped,true);audio.startSnore();assert.equal(sources.length,2);
    audio.setSound(false);assert.equal(sources[1].stopped,true);audio.startSnore();assert.equal(sources.length,2);
  }finally{if(old)Object.defineProperty(globalThis,'AudioContext',old);else Reflect.deleteProperty(globalThis,'AudioContext');}
});
