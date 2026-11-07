import test from 'node:test';
import assert from 'node:assert/strict';
import { gazeAt, roomPouGeometry, containsPou } from '../src/lib/pou-geometry.ts';

test('eyes follow side clicks/cursor positions outside Pou on phones, tablets and laptops', () => {
  for (const [w,h] of [[390,844],[820,1180],[1180,820],[1366,615],[1920,1080]]) {
    const body = roomPouGeometry(w,h);
    assert.equal(gazeAt({x:10,y:body.y},body).x, -1);
    assert.equal(gazeAt({x:w-10,y:body.y},body).x, 1);
    assert.equal(gazeAt({x:body.x,y:0},body).y, -1);
    assert.equal(gazeAt({x:body.x,y:h},body).y, 1);
    assert.deepEqual(gazeAt({x:body.x,y:body.y-body.size/6},body), {x:0,y:0});
  }
});

test('baby and adult stand on the same floor and their touch area follows their size', () => {
  for (const [w,h] of [[390,844],[820,1180],[1366,615]]) {
    const adult=roomPouGeometry(w,h,1),baby=roomPouGeometry(w,h,.5);
    assert.ok(Math.abs((adult.y+adult.size*141/300)-(baby.y+baby.size*141/300))<1e-8);
    assert.equal(baby.size,adult.size/2);
    assert.equal(containsPou({x:baby.x,y:baby.y},baby),true);
    assert.equal(containsPou({x:adult.x,y:adult.y-adult.size*.35},baby),false);
  }
});
