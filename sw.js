/* Service worker : le site s'installe sur l'écran d'accueil et ses fichiers restent disponibles hors connexion.
   Réseau d'abord (tu vois toujours la dernière version), cache en secours. Les données Supabase ne sont jamais mises en cache. */
const CACHE = "ipnet-events-v1";
const FICHIERS = ["./", "index.html", "style.css", "app.js", "theme.js", "qrcode.min.js", "jsQR.js", "logo.svg", "mixx.png", "icon-192.png"];
self.addEventListener("install", e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(FICHIERS).catch(() => {})).then(() => self.skipWaiting())); });
self.addEventListener("activate", e => { e.waitUntil(caches.keys().then(k => Promise.all(k.filter(x => x !== CACHE).map(x => caches.delete(x)))).then(() => self.clients.claim())); });
self.addEventListener("fetch", e => {
  const r = e.request, u = new URL(r.url);
  if (r.method !== "GET" || u.origin !== location.origin) return;
  e.respondWith(fetch(r).then(res => { if (res.ok) { const copie = res.clone(); caches.open(CACHE).then(c => c.put(r, copie)); } return res; })
    .catch(() => caches.match(r).then(m => m || caches.match("index.html"))));
});
