/* Yada — service worker : rend l'app jouable hors connexion.
   À déposer à côté de index.html (même dossier, nom exact "sw.js"). */
const CACHE = "yada-v223";
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
/* ===== CINQ MOTIFS, ET DES MOTS QUI CHANGENT =====
   « Faisons en sorte d'envoyer quand même plus de notifications, et diverses
   et variées. Je veux quand même que ça sonne un minimum. Parce que si ça
   sonne presque jamais, ça n'a aucun intérêt. »
   Il avait raison, et le raisonnement d'avant était incomplet. On avait
   restreint à deux motifs pour éviter le spam, ce qui était juste ; mais un
   rappel qui ne part jamais ne protège personne, il ne fait qu'exister. Le
   bon réglage n'est pas « le moins possible », c'est « au plus une fois par
   jour, et toujours pour une raison que le joueur reconnaîtrait ».
   Le plafond ne bouge donc pas — un seul rappel par jour, tous motifs
   confondus, c'est la ligne « etat.prevenu === aujourdhui » plus bas — mais
   les raisons passent de deux à cinq, et chacune a plusieurs formulations qui
   tournent. Le même texte reçu trois lundis de suite cesse d'être lu ; c'est
   une autre façon de ne rien dire. */
const MOTS = {
  serie: [
    ["Ta série de {n} jours s'arrête ce soir", "Un défi, et elle repart. À tout de suite !"],
    ["{n} jours d'affilée, et ce soir ?", "Trois minutes suffisent pour la garder."],
    ["Ne laisse pas tomber tes {n} jours", "Le défi du jour t'attend, il est court."],
  ],
  defi: [
    ["Le défi du jour t'attend", "Le même pour tout le monde, aujourd'hui seulement."],
    ["Trois minutes, dix questions", "Le défi d'aujourd'hui n'a pas encore été relevé."],
    ["On se fait le défi du jour ?", "Il change demain — celui-là ne reviendra pas."],
    ["Un défi t'attend", "Dix questions pour commencer ta série."],
  ],
  revoir: [
    ["{n} question{s} à revoir aujourd'hui", "Ce sont tes erreurs passées. C'est là qu'on progresse."],
    ["La mémoire réclame {n} question{s}", "Revues aujourd'hui, elles ne reviendront que dans trois jours."],
    ["Tu as {n} question{s} à reprendre", "Deux minutes, et elles montent d'un palier."],
  ],
  absence: [
    ["Ça fait {j} jours", "Ta progression est intacte. On reprend quand tu veux."],
    ["Tu nous manques", "Ta progression t'attend, exactement où tu l'as laissée."],
    ["Le défi du jour continue sans toi", "Rien n'est perdu — tout est encore là."],
  ],
  /* LES VERSETS SONT RECOPIÉS AU MOT PRÈS DE LA LISTE DU JEU (HERO_VERSES,
     Segond 1910), et ce sont tous des versets COMPLETS. Un verset tronqué au
     milieu d'une phrase pour tenir dans un bandeau, dans une app de Bible,
     n'est pas un raccourci : c'est une citation fausse. Hébreux 4:16, pourtant
     le verset signature de l'accueil, a été écarté d'ici pour cette seule
     raison — il fait deux fois la longueur tenable dans une notification. */
  verset: [
    ["Un verset pour la semaine", "« Ta parole est une lampe à mes pieds, Et une lumière sur mon sentier. » Psaume 119:105"],
    ["Un verset pour la semaine", "« Que tout ce qui respire loue l'Éternel ! Louez l'Éternel ! » Psaume 150:6"],
    ["Un verset pour la semaine", "« Je puis tout par celui qui me fortifie. » Philippiens 4:13"],
    ["Un verset pour la semaine", "« L'Éternel est mon berger : je ne manquerai de rien. » Psaume 23:1"],
    ["Un verset pour la semaine", "« Que l'Éternel te bénisse, et qu'il te garde ! » Nombres 6:24"],
    ["Un verset pour la semaine", "« Car rien n'est impossible à Dieu. » Luc 1:37"],
  ],
};
/* La formulation du jour est TIRÉE DU JOUR, pas au hasard : deux envois du
   même jour (une reprise du service d'envoi, par exemple) donnent le même
   texte, et deux jours de suite en donnent deux différents. */
function motsDuJour(genre, jour){
  const liste = MOTS[genre] || MOTS.defi;
  let h = 0;
  for(let i = 0; i < jour.length; i++) h = (h * 31 + jour.charCodeAt(i)) >>> 0;
  return liste[h % liste.length];
}
function remplir(t, val){
  return t.replace(/\{n\}/g, String(val.n))
          .replace(/\{j\}/g, String(val.j))
          .replace(/\{s\}/g, val.n > 1 ? "s" : "");
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
       - on ne l'a pas déjà prévenu aujourd'hui ;
       - et, motif par motif, la raison tient-elle ENCORE à cet instant ?
       Ce dernier point est la raison d'être de tout ce qui suit : entre la
       décision du serveur et l'arrivée de l'envoi, le joueur a pu jouer. */
    if(!etat || !etat.actif) return;
    if(etat.prevenu === aujourdhui) return;      // un seul rappel par jour, tous motifs confondus

    const CONNUS = ["serie", "defi", "revoir", "absence", "verset", "essai"];
    const genre = CONNUS.indexOf(charge.genre) >= 0 ? charge.genre : "serie";
    let titre = "", corps = "";
    const val = { n: 0, j: 0 };

    if(genre === "essai"){
      /* L'ESSAI PASSE OUTRE LES GARDE-FOUS, ET C'EST TOUT SON INTÉRÊT : il
         prouve la chaîne entière (clés, signature, service d'envoi, appareil)
         sans attendre le soir où un vrai rappel aurait lieu. Il ne consomme
         pas le « déjà prévenu aujourd'hui » : un essai ne doit pas voler le
         rappel du jour. */
      titre = "Les rappels sont bien branch\u00e9s";
      corps = "C'est un essai. Tu recevras au plus un rappel par jour.";
    } else if(genre === "serie"){
      /* - il a une série à perdre (deux jours au moins) ;
         - il n'a PAS déjà joué le défi aujourd'hui ;
         - il l'a joué hier, donc la série est encore rattrapable. */
      if((etat.serie | 0) < 2) return;
      if(etat.dernier === aujourdhui) return;
      if(etat.dernier !== jourLocal(dec - 1440)) return;
      val.n = etat.serie | 0;
    } else if(genre === "defi"){
      /* LE DÉFI DU JOUR, PAS ENCORE RELEVÉ — pour celui qui le fait D'HABITUDE.
         La condition n'est pas « a joué récemment » mais « a fait le Défi dans
         la semaine » : on ne rappelle un rendez-vous qu'à ceux qui l'ont pris.
         Sans cela, quelqu'un qui joue tous les jours en solo sans jamais
         toucher au Défi le recevrait tous les soirs — c'est exactement le cas
         que le banc du serveur a fait apparaître (voir DEFI_MEMOIRE dans
         notifications/rappels.ts). Les deux côtés disent la même règle : le
         serveur décide, l'appareil revérifie. */
      if(!etat.dernier) return;
      if(etat.dernier === aujourdhui) return;
      const depuisDefi = Math.round((Date.parse(aujourdhui + "T00:00:00Z") - Date.parse(etat.dernier + "T00:00:00Z")) / 86400000);
      if(!(depuisDefi >= 1 && depuisDefi <= 7)) return;
    } else if(genre === "revoir"){
      /* CE QUI EST À REVOIR AUJOURD'HUI. L'appareil recompte : le carnet a pu
         être vidé depuis que le serveur a lu son chiffre. */
      const n = etat.revoir | 0;
      if(n < 1) return;
      val.n = n;
    } else if(genre === "verset"){
      /* Un verset, une fois par semaine. Il ne demande rien, il ne reproche
         rien : c'est le seul rappel qui n'attend pas qu'on joue. Il vérifie
         quand même que le joueur n'a pas disparu — à quelqu'un parti depuis
         deux mois, un verset du dimanche est la carte postale d'un jeu qu'il
         a quitté, et c'est « absence » qui doit parler. Le serveur applique
         déjà cette borne ; l'appareil la revérifie, comme pour les autres :
         c'est la deuxième barrière, pas la seule. */
      if(!etat.vu) return;
      const absent = Math.round((Date.parse(aujourdhui + "T00:00:00Z") - Date.parse(etat.vu + "T00:00:00Z")) / 86400000);
      if(absent > 14) return;
      val.n = 0;
    } else {
      /* LA LONGUE ABSENCE. On recompte l'écart ici : si le joueur a rejoué
         depuis, « vu » vaut aujourd'hui et l'écart tombe à zéro. */
      if(!etat.vu) return;
      const j = Math.round((Date.parse(aujourdhui + "T00:00:00Z") - Date.parse(etat.vu + "T00:00:00Z")) / 86400000);
      if(!(j >= 3)) return;
      if(typeof charge.jours === "number" && j !== charge.jours) return;
      val.j = j;
    }

    if(!titre){
      const m = motsDuJour(genre, aujourdhui);
      titre = remplir(m[0], val);
      corps = remplir(m[1], val);
    }

    await self.registration.showNotification(titre, {
      body: corps,
      icon: "./icon-192.png", badge: "./icon-192.png",
      tag: genre, renotify: false, requireInteraction: false,
      data: { url: "./" },
    });
    /* on note le jour : même si un second envoi arrivait, il resterait muet.
       Sauf pour un essai, qui ne doit pas voler le rappel du jour. */
    if(genre === "essai") return;
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
