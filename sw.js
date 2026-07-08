/* BibleTrivia — service worker : rend l'app jouable hors connexion.
   À déposer à côté de bibletrivia.html (même dossier, nom exact "sw.js"). */
const CACHE = "bibletrivia-v1";
self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(["./"])).catch(()=>{}));
  self.skipWaiting();
});
self.addEventListener("activate", (e) => {
  e.waitUntil(self.clients.claim());
});
self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  e.respondWith(
    caches.match(e.request).then((hit) => {
      if (hit) return hit;
      return fetch(e.request).then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(e.request, copy)).catch(()=>{});
        return res;
      }).catch(() => caches.match("./"));
    })
  );
});
