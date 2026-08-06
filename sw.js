/* BibleTrivia — service worker : rend l'app jouable hors connexion.
   À déposer à côté de index.html (même dossier, nom exact "sw.js"). */
const CACHE = "bibletrivia-v95";
const CORE = ["./", "./index.html", "./manifest.json", "./apple-touch-icon.png", "./icon-192.png", "./icon-512.png", "./fonts/inter-latin.woff2", "./fonts/inter-latinext.woff2", "./fonts/fraunces-italic-latin.woff2", "./fonts/fraunces-italic-latinext.woff2", "./fonts/poppins-500-latin.woff2", "./fonts/poppins-500-latinext.woff2", "./fonts/poppins-600-latin.woff2", "./fonts/poppins-600-latinext.woff2", "./fonts/poppins-700-latin.woff2", "./fonts/poppins-700-latinext.woff2"];
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
  const req = e.request;
  /* Pages (navigation) : réseau d'abord pour recevoir les mises à jour, sinon
     l'app EN CACHE — garantie que le jeu démarre TOUJOURS, même hors ligne
     (plus de page blanche). On retombe sur index.html puis "./". */
  if (req.mode === "navigate") {
    e.respondWith(
      fetch(req)
        .then((res) => { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {}); return res; })
        .catch(() => caches.match(req).then((hit) => hit || caches.match("./index.html")).then((hit) => hit || caches.match("./")))
    );
    return;
  }
  /* Ressources : cache d'abord, réseau en secours (et on met en cache au passage
     les réponses valides — y compris polices/CDN — pour qu'elles marchent hors
     ligne la fois suivante). IMPORTANT : hors ligne et non caché, on renvoie une
     réponse VIDE propre (504), jamais l'index HTML — sinon un <script>/<link>
     recevait du HTML et cassait la page. */
  e.respondWith(
    caches.match(req).then((hit) => {
      if (hit) return hit;
      return fetch(req).then((res) => {
        if (res && (res.ok || res.type === "opaque")) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
        }
        return res;
      }).catch(() => new Response("", { status: 504, statusText: "hors ligne" }));
    })
  );
});
