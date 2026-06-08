const CACHE_NAME = '4ever-memories-v1';
const STATIC_ASSETS = [
  '/',
  '/browse',
  '/inventory',
  '/contact',
  '/install',
  '/manifest.json',
  '/privacy-policy.html',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/apple-touch-icon.png',
  '/icons/favicon.ico'
];

const OFFLINE_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>4 Ever Memories — Offline</title>
<style>
  body { margin: 0; background: #0d0d0d; color: #fff; font-family: Arial, sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; text-align: center; padding: 24px; box-sizing: border-box; }
  h1 { color: #c9a84c; font-size: 28px; margin-bottom: 12px; }
  p { color: #a0a090; font-size: 16px; line-height: 1.6; max-width: 320px; }
  .icon { font-size: 64px; margin-bottom: 24px; }
  button { margin-top: 24px; padding: 12px 28px; background: #c9a84c; color: #0d0d0d; border: none; border-radius: 8px; font-size: 16px; cursor: pointer; font-weight: bold; }
</style>
</head>
<body>
<div class="icon">📀</div>
<h1>No Connection</h1>
<p>You appear to be offline. Please reconnect to browse our record collection.</p>
<button onclick="window.location.reload()">Try Again</button>
</body>
</html>`;

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(STATIC_ASSETS).catch(() => {});
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(event.request).catch(() =>
        new Response(JSON.stringify({ error: 'offline' }), {
          status: 503,
          headers: { 'Content-Type': 'application/json' }
        })
      )
    );
    return;
  }

  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(
      caches.match(event.request).then(cached => {
        if (cached) return cached;
        return fetch(event.request).then(response => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          return response;
        });
      })
    );
    return;
  }

  event.respondWith(
    fetch(event.request).then(response => {
      const clone = response.clone();
      caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
      return response;
    }).catch(() =>
      caches.match(event.request).then(cached => {
        if (cached) return cached;
        return new Response(OFFLINE_HTML, {
          status: 200,
          headers: { 'Content-Type': 'text/html' }
        });
      })
    )
  );
});
