/* BibleTrivia — service worker : rend l'app jouable hors connexion.
   À déposer à côté de index.html (même dossier, nom exact "sw.js"). */
const CACHE = "bibletrivia-v2";
const CORE = ["./", "./index.html", "./manifest.json", "./apple-touch-icon.png", "./icon-192.png", "./icon-512.png"];
self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(CORE)).catch(() => {}));
  self.skipWaiting();
});
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});
self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  /* Pages : réseau d'abord (pour recevoir les mises à jour), cache en secours. */
  if (e.request.mode === "navigate") {
    e.respondWith(
      fetch(e.request).then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(e.request, copy)).catch(() => {});
        return res;
      }).catch(() => caches.match(e.request).then((hit) => hit || caches.match("./")))
    );
    return;
  }
  /* Ressources : cache d'abord, réseau en secours. */
  e.respondWith(
    caches.match(e.request).then((hit) => {
      if (hit) return hit;
      return fetch(e.request).then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(e.request, copy)).catch(() => {});
        return res;
      }).catch(() => caches.match("./"));
    })
  );
});
