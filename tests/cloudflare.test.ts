import test from 'node:test';
import assert from 'node:assert/strict';
import worker, { PouHub } from '../cloudflare/worker.mjs';

class Socket {
  readyState = 1;
  attachment: any = null;
  sent: any[] = [];
  send(value: string) { this.sent.push(JSON.parse(value)); }
  serializeAttachment(value: any) { this.attachment = structuredClone(value); }
  deserializeAttachment() { return structuredClone(this.attachment); }
  close() { this.readyState = 3; }
}
class Context {
  data = new Map<string, any>();
  sockets: Socket[] = [];
  storage = {
    get: async (key: string) => structuredClone(this.data.get(key)),
    list: async ({prefix}: {prefix: string}) => new Map([...this.data].filter(([key]) => key.startsWith(prefix)).map(([key, value]) => [key, structuredClone(value)])),
    put: async (entries: Record<string, any>) => { for (const [key, value] of Object.entries(entries)) this.data.set(key, structuredClone(value)); },
  };
  blockConcurrencyWhile(fn: () => Promise<void>) { return fn(); }
  getWebSockets() { return this.sockets.filter(s => s.readyState === 1); }
  waitUntil(promise: Promise<unknown>) { void promise; }
}
const send = (hub: PouHub, ws: Socket, packet: any) => hub.webSocketMessage(ws, JSON.stringify(packet));
async function client(hub: PouHub, ctx: Context, id: string, name: string) {
  const ws = new Socket(); ws.serializeAttachment({id, profile:null, room:null}); ctx.sockets.push(ws); hub.connect(ws, id);
  await send(hub, ws, {type:'hello', name});
  return ws;
}

test('Cloudflare hub preserves social profiles, friends and rooms after hibernation', async () => {
  const ctx = new Context(); const hub = new PouHub(ctx as any); await hub.ready;
  const a = await client(hub, ctx, 'a', 'A'); const b = await client(hub, ctx, 'b', 'B');
  const code = b.sent.find(p => p.type === 'social').self.code;
  await send(hub, a, {type:'friend_request', code});
  const aId = a.sent.find(p => p.type === 'social').self.id;
  await send(hub, b, {type:'friend_accept', target:aId});
  await send(hub, a, {type:'create', mode:'food'});
  const room = a.sent.find(p => p.type === 'joined').code;
  await send(hub, b, {type:'join', code:room});
  const restored = new PouHub(ctx as any); await restored.ready;
  assert.equal(restored.social.profiles.size, 2);
  assert.equal(restored.rooms.rooms.get(room).players.size, 2);
  assert.equal(restored.social.profile('a').friends.length, 1);
  assert.equal(restored.rooms.clients.get('b').room, room);
  await send(restored, a, {type:'chat', text:'Hello!'});
  assert.equal(b.sent.at(-1).message.text, 'Hello!');
  await restored.webSocketClose(a); await restored.webSocketClose(b);
});

test('Cloudflare Worker rejects cross-origin WebSockets and serves assets through its binding', async () => {
  const env: any = {ASSETS:{fetch:() => new Response('asset')}, POU_HUB:{idFromName:()=>0,get:()=>({fetch:()=>new Response('socket')})}};
  const forbidden = await worker.fetch(new Request('https://game.example/multiplayer', {headers:{Origin:'https://evil.example'}}), env);
  assert.equal(forbidden.status,403);
  assert.equal(await (await worker.fetch(new Request('https://game.example/'),env)).text(),'asset');
  assert.equal(await (await worker.fetch(new Request('https://game.example/multiplayer',{headers:{Origin:'https://game.example'}}),env)).text(),'socket');
});
