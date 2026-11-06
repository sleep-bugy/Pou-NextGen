import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

function worker(cacheResponse: () => Response | undefined) {
  const listeners: Record<string, (event: any) => void> = {};
  vm.runInNewContext(readFileSync(new URL('../public/sw.js', import.meta.url), 'utf8'), {
    self: { addEventListener: (name: string, fn: (event: any) => void) => listeners[name] = fn, location: { origin: 'https://pou.test' } },
    caches: { match: async () => cacheResponse() },
    fetch: async () => { throw new Error('Offline'); },
    URL, Response,
  });
  return async (request: unknown): Promise<Response> => {
    let result: Promise<Response> | undefined;
    listeners.fetch({ request, respondWith: (response: Promise<Response>) => result = response });
    return result!;
  };
}

test('Safari audio range requests use cached AAC data offline', async () => {
  const run = worker(() => new Response(new Uint8Array([0,1,2,3,4,5,6,7,8,9]), { headers: { 'Content-Type': 'audio/mp4' } }));
  const response = await run(new Request('https://pou.test/assets/sounds/eat_1.m4a', { headers: { Range: 'bytes=2-5' } }));
  assert.equal(response.status, 206);
  assert.equal(response.headers.get('Content-Range'), 'bytes 2-5/10');
  assert.equal(response.headers.get('Content-Type'), 'audio/mp4');
  assert.deepEqual([...new Uint8Array(await response.arrayBuffer())], [2,3,4,5]);
});

test('suffix audio ranges and invalid ranges have correct boundaries', async () => {
  const run = worker(() => new Response(new Uint8Array([0,1,2,3,4])));
  const suffix = await run(new Request('https://pou.test/audio', { headers: { Range: 'bytes=-2' } }));
  assert.deepEqual([...new Uint8Array(await suffix.arrayBuffer())], [3,4]);
  const invalid = await run(new Request('https://pou.test/audio', { headers: { Range: 'bytes=9-12' } }));
  assert.equal(invalid.status, 416);
});

test('an installed app can load the cached shell without a network connection', async () => {
  const run = worker(() => new Response('<html>Pou offline</html>'));
  const response = await run({ method: 'GET', url: 'https://pou.test/', headers: new Headers(), mode: 'navigate' });
  assert.match(await response.text(), /Pou offline/);
});
