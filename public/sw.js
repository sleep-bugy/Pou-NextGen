const CACHE = 'pou-core-__VERSION__';
const CORE = /*__CORE__*/ [];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(CORE)));
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => key.startsWith('pou-core-') && key !== CACHE).map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;
  if (request.headers.has('range')) {
    event.respondWith((async () => {
      const cached = await caches.match(url.href);
      if (!cached) return fetch(request);
      const data = await cached.arrayBuffer();
      const match = /^bytes=(\d*)-(\d*)$/.exec(request.headers.get('range') || '');
      if (!match) return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${data.byteLength}` } });
      const start = match[1] ? Number(match[1]) : Math.max(0, data.byteLength - Number(match[2]));
      const end = match[1] && match[2] ? Math.min(Number(match[2]), data.byteLength - 1) : data.byteLength - 1;
      if (start > end || start >= data.byteLength) return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${data.byteLength}` } });
      return new Response(data.slice(start, end + 1), { status: 206, headers: {
        'Content-Type': cached.headers.get('Content-Type') || 'application/octet-stream',
        'Content-Length': String(end - start + 1),
        'Content-Range': `bytes ${start}-${end}/${data.byteLength}`,
        'Accept-Ranges': 'bytes',
      } });
    })());
    return;
  }
  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).catch(() => caches.match('/index.html').then(response => response || Response.error())));
    return;
  }
  event.respondWith((async () => {
    const hit = await caches.match(request);
    if (hit) return hit;
    const response = await fetch(request);
    if (response.ok && (url.pathname.startsWith('/assets/') || url.pathname.startsWith('/icons/'))) {
      const cache = await caches.open('pou-extra-v1');
      event.waitUntil(cache.put(request, response.clone()).catch(() => {}));
    }
    return response;
  })());
});
