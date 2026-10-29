/* Service worker XYSTOS : l'app s'ouvre hors ligne.
   Changer VERSION à chaque mise à jour de index.html pour que le téléphone récupère la nouvelle version. */
const VERSION = 'xystos-v6';
const FICHIERS = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png', './apple-touch-icon.png'];
const POLICES = ['fonts.googleapis.com', 'fonts.gstatic.com'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(FICHIERS)).then(() => self.skipWaiting()));
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
  // fichiers de l'app : le cache d'abord, le réseau en secours
  e.respondWith(caches.match(req, { ignoreSearch: true }).then((r) => r || fetch(req).catch(() => caches.match('./index.html'))));
});
