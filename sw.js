/* Service worker XYSTOS : l'app s'ouvre hors ligne.
   Changer VERSION à chaque mise à jour de index.html pour que le téléphone récupère la nouvelle version. */
const VERSION = 'xystos-v13';
const FICHIERS = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png', './apple-touch-icon.png'];
const POLICES = ['fonts.googleapis.com', 'fonts.gstatic.com'];

self.addEventListener('install', (e) => {
  // cache: 'reload' : on ne reprend jamais une copie périmée du cache HTTP du navigateur
  e.waitUntil(caches.open(VERSION).then((c) => Promise.all(FICHIERS.map((f) => fetch(new Request(f, { cache: 'reload' })).then((r) => { if (!r.ok) throw new Error(f); return c.put(f, r); })))).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (POLICES.includes(url.hostname)) {
    // polices : on sert le cache tout de suite et on le rafraîchit en arrière-plan
    e.respondWith(caches.open(VERSION).then(async (c) => {
      const vu = await c.match(req);
      const reseau = fetch(req).then((r) => { if (r.ok || r.type === 'opaque') c.put(req, r.clone()); return r; }).catch(() => vu);
      return vu || reseau;
    }));
    return;
  }
  if (url.origin !== location.origin) return;
  // fichiers de l'app : le réseau d'abord (toujours la dernière version), le cache hors ligne
  e.respondWith(fetch(req, { cache: 'no-cache' }).then((r) => {
    if (r.ok) { const copie = r.clone(); caches.open(VERSION).then((c) => c.put(req, copie)); }
    return r;
  }).catch(() => caches.match(req, { ignoreSearch: true }).then((r) => r || caches.match('./index.html'))));
});
