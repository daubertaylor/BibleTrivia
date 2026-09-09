/* Yada — service worker : rend l'app jouable hors connexion.
   À déposer à côté de index.html (même dossier, nom exact "sw.js"). */
const CACHE = "yada-v206";
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

/* ===================== LE RAPPEL DE SÉRIE =====================
   Le serveur n'envoie QUE lorsqu'il a une raison de le faire (série vivante,
   défi pas encore joué, soirée chez le joueur). Ici, on revérifie quand même
   sur l'appareil, en relisant l'état recopié dans IndexedDB : entre le moment
   où le serveur décide et celui où l'envoi arrive, le joueur a pu jouer. Dans
   ce cas on n'affiche rien — mieux vaut un envoi silencieux très rare qu'un
   rappel qui ment.
   Un service worker n'a PAS accès au localStorage : c'est pour cela que le jeu
   recopie ces deux valeurs dans IndexedDB à chaque changement. */
function jourLocal(dec){
  const d = new Date(Date.now() + (dec || 0) * 60000);
  const p = (n) => String(n).padStart(2, "0");
  return d.getUTCFullYear() + "-" + p(d.getUTCMonth() + 1) + "-" + p(d.getUTCDate());
}
function litEtat(){
  return new Promise((res) => {
    try {
      const r = indexedDB.open("bibletrivia", 1);
      r.onupgradeneeded = () => { const db = r.result;
        if(!db.objectStoreNames.contains("etat")) db.createObjectStore("etat"); };
      r.onsuccess = () => {
        try {
          const db = r.result;
          const g = db.transaction("etat", "readonly").objectStore("etat").get("serie");
          g.onsuccess = () => res(g.result || null);
          g.onerror   = () => res(null);
        } catch(e){ res(null); }
      };
      r.onerror = () => res(null);
    } catch(e){ res(null); }
  });
}
self.addEventListener("push", (e) => {
  e.waitUntil((async () => {
    let charge = {};
    try { charge = e.data ? e.data.json() : {}; } catch(x){}
    const dec = typeof charge.decalage === "number" ? charge.decalage : -(new Date().getTimezoneOffset());
    const etat = await litEtat();
    const aujourdhui = jourLocal(dec);
    /* Les garde-fous, dans l'ordre où ils comptent :
       - le joueur a bien accepté ;
       - il a une série à perdre (deux jours au moins) ;
       - il n'a PAS déjà joué aujourd'hui ;
       - il a joué hier, donc la série est encore rattrapable aujourd'hui ;
       - on ne l'a pas déjà prévenu aujourd'hui. */
    if(!etat || !etat.actif) return;
    if(etat.prevenu === aujourdhui) return;      // un seul rappel par jour, tous cas confondus

    /* DEUX CAS, ET LE SERVEUR DIT LEQUEL. L'appareil ne le croit pas sur
       parole : il revérifie avec ce qu'il sait, lui, de première main. Entre
       la décision du serveur et l'arrivée de l'envoi, le joueur a pu jouer —
       auquel cas il ne doit rien voir du tout. */
    const genre = charge.genre === "absence" ? "absence" : "serie";
    let titre = "", corps = "";

    if(genre === "serie"){
      /* - il a une série à perdre (deux jours au moins) ;
         - il n'a PAS déjà joué le défi aujourd'hui ;
         - il l'a joué hier, donc la série est encore rattrapable. */
      if((etat.serie | 0) < 2) return;
      if(etat.dernier === aujourdhui) return;
      if(etat.dernier !== jourLocal(dec - 1440)) return;
      const n = (etat.serie | 0);
      titre = "Ta série de " + n + " jours s'arrête ce soir";
      corps = "Un défi, et elle repart. \u00c0 tout de suite\u00a0!";
    } else {
      /* LA LONGUE ABSENCE. On recompte l'écart ici : si le joueur a rejoué
         depuis, « vu » vaut aujourd'hui et l'écart tombe à zéro. */
      if(!etat.vu) return;
      const j = Math.round((Date.parse(aujourdhui + "T00:00:00Z") - Date.parse(etat.vu + "T00:00:00Z")) / 86400000);
      if(!(j >= 7)) return;
      if(typeof charge.jours === "number" && j !== charge.jours) return;
      titre = j >= 30 ? "\u00c7a fait un mois" : "\u00c7a fait une semaine";
      corps  = j >= 30
        ? "Ta progression est intacte. On reprend quand tu veux."
        : "Un d\u00e9fi t'attend \u2014 trois minutes suffisent.";
    }

    await self.registration.showNotification(titre, {
      body: corps,
      icon: "./icon-192.png", badge: "./icon-192.png",
      tag: genre, renotify: false, requireInteraction: false,
      data: { url: "./" },
    });
    /* on note le jour : même si un second envoi arrivait, il resterait muet */
    try {
      const r = indexedDB.open("bibletrivia", 1);
      r.onsuccess = () => { try {
        const db = r.result;
        const st = db.transaction("etat", "readwrite").objectStore("etat");
        st.put(Object.assign({}, etat, { prevenu: aujourdhui }), "serie");
      } catch(x){} };
    } catch(x){}
  })());
});
self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const cible = (e.notification.data && e.notification.data.url) || "./";
  e.waitUntil(clients.matchAll({ type:"window", includeUncontrolled:true }).then((liste) => {
    for(const c of liste){ if("focus" in c) return c.focus(); }   // l'app est déjà ouverte
    if(clients.openWindow) return clients.openWindow(cible);
  }));
});
