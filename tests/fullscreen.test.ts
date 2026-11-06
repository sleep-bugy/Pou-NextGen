import test from 'node:test';
import assert from 'node:assert/strict';
import { isFullscreen, toggleFullscreen } from '../src/lib/fullscreen.ts';
import { createGameViewport, toGamePoint } from '../src/lib/viewport.ts';
import { gameHud } from '../src/lib/assets.ts';

test('fullscreen enters and exits through the standard browser API', async () => {
  const root = { async requestFullscreen() { doc.fullscreenElement = root; } };
  const doc = { documentElement: root, fullscreenElement: null as unknown, async exitFullscreen() { doc.fullscreenElement = null; } };
  assert.equal(await toggleFullscreen(doc as unknown as Document), 'entered');
  assert.equal(isFullscreen(doc as unknown as Document), true);
  assert.equal(await toggleFullscreen(doc as unknown as Document), 'exited');
  assert.equal(isFullscreen(doc as unknown as Document), false);
});

test('the minigame HUD only shows clocks and lives used by that game',()=>{
  assert.deepEqual(gameHud('catch'),{timed:false,lives:true});
  assert.deepEqual(gameHud('memory'),{timed:false,lives:false});
  assert.deepEqual(gameHud('swap'),{timed:true,lives:false});
  assert.deepEqual(gameHud('hoops'),{timed:true,lives:true});
});

test('the older Safari-prefixed fullscreen API works too', async () => {
  const root = { webkitRequestFullscreen() { doc.webkitFullscreenElement = root; } };
  const doc = { documentElement: root, webkitFullscreenElement: null as unknown, webkitExitFullscreen() { doc.webkitFullscreenElement = null; } };
  assert.equal(await toggleFullscreen(doc as unknown as Document), 'entered');
  assert.equal(await toggleFullscreen(doc as unknown as Document), 'exited');
});

test('unsupported or rejected fullscreen requests never pretend to enter fullscreen', async () => {
  const unsupported = { documentElement: {} } as Document;
  assert.equal(await toggleFullscreen(unsupported), 'unsupported');
  assert.equal(isFullscreen(unsupported), false);
  const denied = { documentElement: { async requestFullscreen() { throw new Error('Denied'); } } } as unknown as Document;
  await assert.rejects(() => toggleFullscreen(denied), /Denied/);
  assert.equal(isFullscreen(denied), false);
});

test('game sprites retain their aspect ratio and pointer positions after resizing', () => {
  for (const [width,height] of [[390,680],[820,1050],[1180,680],[1440,760],[1920,920],[2560,1000]]) {
    const fit = createGameViewport(width, height);
    assert.ok(Math.abs(fit.width * fit.scale - width)<1e-6);
    assert.ok(Math.abs(fit.height * fit.scale - height)<1e-6);
    for (const point of [{x:0,y:0},{x:fit.width/2,y:340},{x:96,y:183},{x:fit.width,y:680}]) {
      const mapped = toGamePoint(fit.x + point.x * fit.scale, fit.y + point.y * fit.scale, width, height);
      assert.ok(Math.abs(mapped.x - point.x) < 1e-6 && Math.abs(mapped.y - point.y) < 1e-6);
    }
  }
});
