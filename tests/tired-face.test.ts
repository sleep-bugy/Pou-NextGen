import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import * as model from '../src/lib/model.ts';
import {tracePouBody} from '../src/lib/pou-geometry.ts';

test('the real character renderer gives exhaustion heavy eyelids rather than an awake smile or ordinary closed eyes',()=>{
  const source=readFileSync(new URL('../src/lib/draw-pou.ts',import.meta.url),'utf8');
  const code=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;
  const exports:any={};vm.runInNewContext(code,{exports,require:(name:string)=>name.endsWith('/model')?model:name.endsWith('/assets')?{getImage:()=>undefined}:{tracePouBody}});
  const rectangles:number[][]=[];
  const c=new Proxy({},{get:(_target,key)=>key==='fillRect'?(...args:number[])=>rectangles.push(args):()=>{},set:()=>true});
  const save=model.newSave(1000);save.stats.energy=8;
  const tired=exports.lookFromSave(model.advance(save,1000));assert.equal(tired.tired,true);assert.equal(tired.sleeping,true);
  exports.drawPou(c,0,0,300,tired);assert.equal(rectangles.filter(r=>r[3]===54).length,2);
  rectangles.length=0;save.stats.energy=80;save.sleeping=true;const normal=exports.lookFromSave(save);assert.equal(normal.tired,false);
  exports.drawPou(c,0,0,300,normal);assert.equal(rectangles.filter(r=>r[3]===73).length,2);
  save.life.state='dead';save.stats.energy=0;assert.equal(exports.lookFromSave(save).tired,false);
});
