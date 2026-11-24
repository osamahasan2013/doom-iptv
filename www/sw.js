/* DOOM IPTV service worker: caches the app shell only (never video or provider API data) */
const CACHE = 'doom-shell-v13';
const SHELL = ['./', './index.html', './css/app.css', './js/version.js', './js/icons.js', './js/core.js', './js/free.js', './js/qr.js', './js/speedtest.js', './js/tvkb.js', './js/subsync.js', './js/player.js', './js/features.js', './js/ui.js', './manifest.webmanifest', './icons/logo-128.png', './icons/icon-512.png', './lib/hls.min.js', './lib/mpegts.js'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => Promise.allSettled(SHELL.map(u => c.add(u)))).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin) return; // streams & APIs go straight to the network
  e.respondWith(fetch(e.request).then(r => { const copy = r.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); return r; }).catch(() => caches.match(e.request).then(r => r || caches.match('./index.html'))));
});
