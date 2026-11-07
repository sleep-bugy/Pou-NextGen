import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { GAMES } from '../../src/lib/assets.ts';
import * as viewport from '../../src/lib/viewport.ts';
import * as physics from '../../src/lib/mini-physics.ts';

const source = readFileSync(new URL('../../src/lib/mini-engine.ts',import.meta.url),'utf8');
const code = ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;

export function arena(game = 'food-drop', width = 1366, height = 530, rng: () => number = () => .97) {
  const rectangles: number[][] = [], sprites: { path: string; x: number; w: number }[] = [], pous: number[] = [];
  const paths: {method:string;args:number[]}[] = [];
  const coinAwards: number[] = [];
  let matrix = [1,0,0,1,0,0], observer: () => void = () => {};
  const rect = { left:0, top:0, width, height };
  const events = new Map<string,(event: unknown)=>void>();
  const c = new Proxy({}, {get(_target, key) {
    if (key === 'setTransform') return (...values: number[]) => matrix = values;
    if (key === 'fillRect') return (x:number,y:number,w:number,h:number) => rectangles.push([x*matrix[0]+matrix[4],y*matrix[3]+matrix[5],w*matrix[0],h*matrix[3]]);
    if (key === 'drawImage') return (image:{path:string},x:number,_y:number,w:number) => sprites.push({path:image.path,x:x*matrix[0]+matrix[4],w:w*matrix[0]});
    return (...args:number[]) => paths.push({method:String(key),args});
  },set(){return true;}});
  const canvas = { width:0,height:0,getContext:()=>c,getBoundingClientRect:()=>rect,setPointerCapture(){},addEventListener:(name:string,fn:(e:unknown)=>void)=>events.set(name,fn) };
  const exports:Record<string,any> = {};
  const scope = vm.createContext({exports,AbortController,Math:Object.assign(Object.create(Math),{random:rng}),devicePixelRatio:1,document:{hidden:false},window:{addEventListener(){}},requestAnimationFrame:()=>1,cancelAnimationFrame(){},
    ResizeObserver:class{constructor(fn:()=>void){observer=fn;}observe(){observer();}disconnect(){}},
    require:(name:string)=> name.endsWith('/assets')?{GAMES,getImage:(path:string)=>({path,width:100,height:100})}:name.endsWith('/draw-pou')?{drawPou:(_c:unknown,x:number)=>pous.push(x*matrix[0]+matrix[4])}:name.endsWith('/audio')?{audio:{play(){}}}:name.endsWith('/viewport')?viewport:name.endsWith('/mini-physics')?physics:undefined,
  });
  vm.runInContext(code,scope);
  const engine = new exports.MiniEngine(canvas,game,{},()=>{},()=>{},undefined,(amount:number)=>coinAwards.push(amount));
  return {engine,canvas,events,rect,sprites,pous,rectangles,paths,coinAwards,helpers:exports,resize:()=>observer()};
}
