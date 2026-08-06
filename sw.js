/* BibleTrivia — service worker : rend l'app jouable hors connexion.
   À déposer à côté de index.html (même dossier, nom exact "sw.js"). */
const CACHE = "bibletrivia-v100";
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
/* LE SECOURS : l'app EN CACHE, jamais une page d'erreur. On y passe par les
   DEUX portes — réseau coupé (fetch lève) ET serveur qui répond mal (fetch
   réussit, avec un 404/5xx). En tout dernier recours seulement, faute de copie
   en cache, on rend la réponse du serveur telle quelle : mieux vaut son message
   d'erreur qu'une page blanche. */
function secours(req, res) {
  return caches.match(req)
    .then((hit) => hit || caches.match("./index.html"))
    .then((hit) => hit || caches.match("./"))
    .then((hit) => hit || res || new Response("", { status: 504, statusText: "hors ligne" }));
}
self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  const req = e.request;
  /* Pages (navigation) : réseau d'abord pour recevoir les mises à jour, sinon
     l'app EN CACHE — garantie que le jeu démarre TOUJOURS, même hors ligne
     (plus de page blanche). On retombe sur index.html puis "./". */
  if (req.mode === "navigate") {
    e.respondWith(
      fetch(req)
        .then((res) => {
          /* UNE MAUVAISE RÉPONSE N'EST PAS UNE RÉPONSE. fetch() ne lève une
             erreur QUE si le réseau est coupé : face à un serveur qui répond
             404 ou 500, il RÉUSSIT, avec un mauvais code. Sans ce garde-fou,
             une panne d'hébergement était donc servie au joueur comme si de
             rien n'était — et pire, Cache.put() acceptant les codes d'erreur,
             elle REMPLAÇAIT sa copie hors ligne. Le joueur se retrouvait avec
             une page d'erreur figée dans son app installée, et ne pouvait plus
             jouer du tout, même sans réseau. On bascule donc sur le cache
             exactement comme si la connexion était tombée. */
          if (!res || !res.ok) return secours(req, res);
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
          return res;
        })
        .catch(() => secours(req, null))
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
