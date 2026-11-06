import { RoomHub } from '../server/rooms.mjs';
import { SocialHub } from '../server/social.mjs';
import { WorldHub } from '../server/world.mjs';

const MAX_MESSAGE_BYTES = 2048;
const MAX_CLIENTS = 200;

/** A single shared lobby preserves friend codes, chat and room discovery. */
export class PouHub {
  constructor(ctx) {
    this.ctx = ctx;
    this.sockets = new Map();
    this.dirty = false;
    this.timer = null;
    this.writeQueue = Promise.resolve();
    this.ready = ctx.blockConcurrencyWhile(async () => {
      const saved = await ctx.storage.get('lobby');
      const profiles = await ctx.storage.list({ prefix: 'profile:' });
      this.lastProfiles = new Map([...profiles].map(([key, value]) => [key, JSON.stringify(value)]));
      this.rooms = new RoomHub();
      const socialState = profiles.size ? { version: 1, profiles: [...profiles.values()] } : saved?.social;
      this.social = new SocialHub(this.rooms, { state: socialState, onchange: () => { this.dirty = true; } });
      this.world = new WorldHub(this.social, this.rooms);
      this.rooms.onComplete = room => this.world.finish(room);
      this.social.chat = saved?.chat ?? [];
      this.social.invitations = new Map(saved?.invitations ?? []);
      for (const ws of ctx.getWebSockets()) {
        const attachment = ws.deserializeAttachment();
        if (!attachment?.id) { ws.close(1011, 'Invalid session'); continue; }
        this.connect(ws, attachment.id);
        const connection = this.social.connections.get(attachment.id);
        if (attachment.profile && this.social.profiles.has(attachment.profile)) connection.profile = attachment.profile;
        this.rooms.clients.get(attachment.id).room = attachment.room ?? null;
      }
      for (const room of saved?.rooms ?? []) {
        room.players = new Map(room.players.filter(([id]) => this.sockets.has(id)));
        if (!room.players.size) continue;
        if (!room.players.has(room.host)) room.host = room.players.keys().next().value;
        if (room.mode === 'adventure' && room.players.size < 2 && ['playing','countdown'].includes(room.phase)) room.phase = 'lobby';
        this.rooms.rooms.set(room.code, room);
      }
      for (const client of this.rooms.clients.values()) if (!this.rooms.rooms.has(client.room)) client.room = null;
      this.startTimer();
    });
  }
  connect(ws, id) {
    this.sockets.set(id, ws);
    const send = packet => {
      if (ws.readyState === 1) {
        try { ws.send(JSON.stringify(packet)); } catch { /* close event will clean up */ }
      }
    };
    this.rooms.connect(id, send);
    this.social.connect(id, send);
  }
  attachments() {
    for (const [id, ws] of this.sockets) ws.serializeAttachment({
      id, profile: this.social.connections.get(id)?.profile ?? null,
      room: this.rooms.clients.get(id)?.room ?? null,
    });
  }
  snapshot() {
    return { chat: this.social.chat,
      invitations: [...this.social.invitations], rooms: [...this.rooms.rooms.values()].map(room => ({ ...room, players: [...room.players] })) };
  }
  async persist() {
    this.attachments();
    const snapshot = structuredClone(this.snapshot());
    const profiles = this.social.dump().profiles;
    this.dirty = false;
    const write = this.writeQueue.catch(() => {}).then(async () => {
      const changes = { lobby: snapshot };
      for (const profile of profiles) {
        const key = `profile:${profile.id}`, value = JSON.stringify(profile);
        if (this.lastProfiles.get(key) !== value) changes[key] = profile;
      }
      await this.ctx.storage.put(changes);
      for (const [key, value] of Object.entries(changes)) if (key.startsWith('profile:')) this.lastProfiles.set(key, JSON.stringify(value));
    });
    this.writeQueue = write;
    try { await write; } catch (error) { this.dirty = true; throw error; }
  }
  startTimer() {
    const playing = [...this.rooms.rooms.values()].some(room => ['playing','countdown'].includes(room.phase));
    if (!playing && this.timer) { clearInterval(this.timer); this.timer = null; }
    if (playing && !this.timer) {
      let previous = Date.now(), elapsed = 0;
      this.timer = setInterval(() => {
        const now = Date.now(); elapsed += Math.min((now - previous) / 1000, 0.25); previous = now;
        while (elapsed >= 0.05) { this.rooms.tick(0.05); elapsed -= 0.05; }
        this.social.maintenance();
        if (this.dirty) this.ctx.waitUntil(this.persist().catch(error => console.error('Could not save multiplayer state', error)));
        const active = [...this.rooms.rooms.values()].some(room => ['playing','countdown'].includes(room.phase));
        if (!active) {
          clearInterval(this.timer); this.timer = null;
          // Persist results and queued rewards before allowing the object to hibernate.
          this.ctx.waitUntil(this.persist().catch(error => console.error('Could not save multiplayer state', error)));
        }
      }, 50);
    }
  }
  async fetch(request) {
    await this.ready;
    if (request.headers.get('Upgrade')?.toLowerCase() !== 'websocket') return new Response('WebSocket required', { status: 426 });
    if (this.sockets.size >= MAX_CLIENTS) return new Response('Server penuh', { status: 503 });
    const [client, server] = Object.values(new WebSocketPair());
    this.ctx.acceptWebSocket(server);
    const id = crypto.randomUUID();
    this.connect(server, id);
    server.serializeAttachment({ id, profile: null, room: null });
    return new Response(null, { status: 101, webSocket: client });
  }
  async webSocketMessage(ws, message) {
    await this.ready;
    const id = ws.deserializeAttachment()?.id;
    if (!id || !this.sockets.has(id)) return;
    try {
      if (typeof message !== 'string' || new TextEncoder().encode(message).byteLength > MAX_MESSAGE_BYTES) { ws.close(1009, 'Message too large'); return; }
      const packet = JSON.parse(message);
      if (this.social.message(id, packet)) {
        if (packet?.type === 'hello') this.world.sync(id);
      } else if (!this.world.message(id, packet)) {
        const profile = this.social.profile(id);
        if (!profile) this.social.error(this.social.connections.get(id), 'Profil belum terhubung. Coba hubungkan kembali.');
        else { this.rooms.message(id, { ...packet, name: profile.name, profileId: profile.id }); if (packet.type !== 'input') this.social.broadcast(); }
      }
      if (packet.type !== 'input' || this.dirty) await this.persist();
      this.startTimer();
    } catch (error) {
      console.error('Multiplayer request failed', error);
      if (ws.readyState === 1) ws.send(JSON.stringify({ type: 'error', message: 'Pesan tidak valid atau penyimpanan server bermasalah.' }));
    }
  }
  async disconnect(ws) {
    await this.ready;
    const id = ws.deserializeAttachment()?.id;
    if (!id || !this.sockets.has(id)) return;
    this.sockets.delete(id); this.rooms.disconnect(id); this.world.disconnect(id); this.social.disconnect(id);
    await this.persist(); this.startTimer();
  }
  async webSocketClose(ws) { await this.disconnect(ws); }
  async webSocketError(ws) { await this.disconnect(ws); }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === '/multiplayer') {
      const origin = request.headers.get('Origin');
      if (origin) { try { if (new URL(origin).host !== url.host) return new Response('Forbidden', { status: 403 }); } catch { return new Response('Forbidden', { status: 403 }); } }
      return env.POU_HUB.get(env.POU_HUB.idFromName('global')).fetch(request);
    }
    if (url.pathname === '/api/health') return Response.json({ ok: true, backend: 'cloudflare' }, { headers: { 'Cache-Control': 'no-store' } });
    return env.ASSETS.fetch(request);
  },
};
