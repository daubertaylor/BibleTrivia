/* Yada — service worker : rend l'app jouable hors connexion.
   À déposer à côté de index.html (même dossier, nom exact "sw.js"). */
const CACHE = "yada-v328";
/* ===== LES BANQUES DE QUESTIONS NE SONT PAS DANS LE SOCLE =====
   questions-en.js y était, et questions-es.js allait l'y rejoindre : six cent
   mille octets téléchargés à l'installation par TOUT LE MONDE, y compris les
   joueurs français, qui n'en liront jamais une ligne. C'était contraire à
   l'intention écrite le jour même où le fichier est né (« chargés SEULEMENT si
   le joueur est en anglais ») — une ligne ajoutée par réflexe.
   Elles ne s'y trouvent plus. La règle des ressources ci-dessous les met en
   cache à la PREMIÈRE lecture, et cette première lecture a lieu à l'ouverture
   du jeu (chargerBanque), pas à la première partie : un joueur anglais ou
   espagnol qui a ouvert le jeu une fois en ligne l'a hors ligne ensuite,
   exactement comme avant. */
const CORE = ["./", "./index.html", "./manifest.json", "./apple-touch-icon.png", "./icon-192.png", "./icon-512.png", "./fonts/inter-latin.woff2", "./fonts/inter-latinext.woff2", "./fonts/fraunces-italic-latin.woff2", "./fonts/fraunces-italic-latinext.woff2", "./fonts/poppins-500-latin.woff2", "./fonts/poppins-500-latinext.woff2", "./fonts/poppins-600-latin.woff2", "./fonts/poppins-600-latinext.woff2", "./fonts/poppins-700-latin.woff2", "./fonts/poppins-700-latinext.woff2"];
/* ===== UNE VERSION NE S'INSTALLE QU'ENTIÈRE, ET AVEC DU FRAIS =====
   Deux défauts, trouvés en même temps que celui du lancement (voir plus bas) :
   1. LE CACHE HTTP. GitHub Pages dit « garde dix minutes ». Un joueur qui
      avait ouvert le jeu dans ces dix minutes recevait le NOUVEAU service
      worker… qui rangeait l'ANCIENNE page, prise dans ce cache-là. D'où
      « cache: reload » : à l'installation, on redemande tout au serveur.
   2. UNE INSTALLATION RATÉE ÉTAIT AVALÉE EN SILENCE (le .catch vide). Sur un
      mauvais réseau, la page de 2,8 Mo n'arrivait pas, l'installation se
      disait réussie quand même, la version s'activait et EFFAÇAIT l'ancien
      cache : le jeu perdait sa copie hors ligne au pire moment. Désormais
      l'installation échoue franchement, l'ancienne version reste en place
      avec son cache entier, et le navigateur réessaiera plus tard. */
self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(CORE.map((u) => new Request(u, { cache: "reload" })))));
  self.skipWaiting();
});
/* ===== « GARDE-MOI ÇA » : LA PAGE DEMANDE, LE SERVICE WORKER RANGE =====
   La banque de questions de la langue n'est plus dans le socle (voir CORE), et
   la porte des ressources ne suffisait pas à la rattraper : au TOUT PREMIER
   chargement, le service worker vient à peine de s'installer, il ne contrôle
   pas encore la page — la requête du <script> passe donc à côté de lui, et
   rien n'est mis en cache. Mesuré : cache vide de questions-es.js après une
   première visite en espagnol.
   La page le lui demande donc explicitement, une fois la banque arrivée. Un
   seul fichier, celui de SA langue, et il est en cache dès la première
   ouverture — comme avant, mais sans faire payer les autres langues à tout le
   monde. Si le réseau tombe entre-temps, cache.add() échoue sans bruit et la
   demande sera refaite à la prochaine ouverture. */
self.addEventListener("message", (e) => {
  /* « QUELLE VERSION ES-TU ? » La page compare la réponse à la sienne : si le
     service worker qui la sert est plus récent qu'elle, elle se recharge au
     premier moment invisible (voir verifierVersion dans index.html). Deviner
     d'après les caches ne marchait pas : la prise de main arrive au DÉBUT de
     l'activation, quand l'ancien cache n'est pas encore effacé. */
  if (e.data && e.data.quelleVersion && e.ports && e.ports[0]) { e.ports[0].postMessage({ version: CACHE }); return; }
  const u = e.data && e.data.garder;
  if (typeof u !== "string" || !/^questions-[a-z]{2}\.js$/.test(u)) return;
  e.waitUntil(caches.open(CACHE).then((c) => c.match(u).then((hit) => hit || c.add(u))).catch(() => {}));
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
/* ===== LE JEU SE LANCE DEPUIS SON CACHE, TOUT DE SUITE =====
   « Lorsque j'ai pas une bonne connexion, le jeu ne se lance pas. Je suis
   obligé de mettre le mode avion. » (Taylor.)
   Le mode avion était le bon indice. La page était demandée au réseau
   D'ABORD, et sans limite de temps. Réseau coupé : la requête échoue aussitôt
   et le cache prend le relais — le jeu s'ouvre. Réseau qui répond à peine :
   la requête n'échoue pas, elle ATTEND, et le jeu attendait avec elle. Et un
   réseau lent mais vivant ne valait guère mieux : 2,8 Mo à livrer avant la
   première image. banc-essai/reseau-faible.js le reproduit (serveur pendu,
   serveur à 40 Ko/s) : rien à l'écran après douze secondes.
   LA PAGE DU JEU sort donc du cache, sans jamais attendre le réseau. Les
   mises à jour n'y perdent rien : elles ne passent pas par cette requête mais
   par sw.js, que le navigateur revérifie à chaque ouverture. Le nouveau
   service worker range la nouvelle page (du frais, voir l'installation),
   prend la main, et la page se recharge au premier moment invisible — la
   mécanique existait déjà (tenterMaj, dans index.html).
   Seulement la page du jeu : la page d'essai (essai/) vit sous le même
   service worker et garde l'ancienne règle. Et sans copie en cache (tout
   premier lancement), c'est le réseau, comme avant. */
const PAGE = new URL("./", self.registration.scope).href;
function estLaPage(url) {
  const u = new URL(url); u.search = ""; u.hash = "";
  return u.href === PAGE || u.href === PAGE + "index.html";
}
self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  const req = e.request;
  /* LA SONDE DE RÉSEAU (voir sonderReseau dans index.html) : elle mesure le
     réseau, elle ne doit donc JAMAIS être servie par le cache — ni y entrer,
     sans quoi chaque mesure y laisserait une copie sous une adresse neuve. */
  if (new URL(req.url).searchParams.has("sonde")) return;
  if (req.mode === "navigate" && estLaPage(req.url)) {
    e.respondWith(
      caches.open(CACHE)
        .then((c) => c.match("./index.html").then((hit) => hit || c.match("./")))
        .then((hit) => hit || caches.match("./index.html"))
        .then((hit) => hit || fetch(req).then((res) => (res && res.ok) ? res : secours(req, res)).catch(() => secours(req, null)))
    );
    return;
  }
  /* Les autres pages (la page d'essai) : réseau d'abord pour recevoir les
     mises à jour, sinon la copie EN CACHE — jamais une page d'erreur. */
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
/* ===== LES MOTS PARLENT LA LANGUE DU JOUEUR, ET CELLE DU JEU D'AUJOURD'HUI (v326) =====
   Deux défauts, relevés en ajoutant la prière et la lecture :
   — les rappels n'existaient qu'en français : un joueur qui lit le jeu en
     anglais ou en espagnol recevait « Ta série de 5 jours s'arrête ce soir ».
     Le miroir de l'appareil porte maintenant sa langue (notifMiroir) ;
   — ils parlaient d'un « défi du jour » qui n'existe plus dans le jeu : la
     flamme compte n'importe quelle partie. Ils disent donc « ta flamme » et
     « une partie », comme l'écran.
   Les noms des motifs (serie, defi…) ne changent pas : le serveur les envoie.
   Les versets restent recopiés AU MOT PRÈS des listes du jeu, dans la version
   de chaque langue : Segond 1910, King James 1769, Reina-Valera 1909. */
const MOTS = {
  serie: [
    ["Ta flamme de {n} jours s'éteint ce soir", "Une partie avant minuit, et elle continue."],
    ["{n} jours d'affilée, et ce soir ?", "Trois minutes suffisent pour garder ta flamme."],
    ["Ne laisse pas filer tes {n} jours", "Une partie, même courte, garde ta flamme allumée."],
  ],
  defi: [
    ["Une partie aujourd'hui ?", "Trois minutes suffisent, et la journée compte."],
    ["Ta flamme t'attend", "Une partie rapide, et la journée compte pour elle."],
    ["Trois minutes, quelques questions", "Ta partie du jour n'est pas encore jouée."],
    ["On joue aujourd'hui ?", "Une partie pour faire briller ta flamme."],
  ],
  revoir: [
    ["{n} question{s} à revoir aujourd'hui", "Ce sont tes erreurs passées. C'est là qu'on progresse."],
    ["La mémoire réclame {n} question{s}", "Revues aujourd'hui, elles ne reviendront que dans trois jours."],
    ["Tu as {n} question{s} à reprendre", "Deux minutes, et elles montent d'un palier."],
  ],
  absence: [
    ["Ça fait {j} jours", "Ta progression est intacte. On reprend quand tu veux."],
    ["Tu nous manques", "Ta progression t'attend, exactement où tu l'as laissée."],
    ["Tes questions t'attendent", "Rien n'est perdu — tout est encore là."],
  ],
  verset: [
    ["Un verset pour la semaine", "« Ta parole est une lampe à mes pieds, Et une lumière sur mon sentier. » Psaume 119:105"],
    ["Un verset pour la semaine", "« Que tout ce qui respire loue l'Éternel ! Louez l'Éternel ! » Psaume 150:6"],
    ["Un verset pour la semaine", "« Je puis tout par celui qui me fortifie. » Philippiens 4:13"],
    ["Un verset pour la semaine", "« L'Éternel est mon berger : je ne manquerai de rien. » Psaume 23:1"],
    ["Un verset pour la semaine", "« Que l'Éternel te bénisse, et qu'il te garde ! » Nombres 6:24"],
    ["Un verset pour la semaine", "« Car rien n'est impossible à Dieu. » Luc 1:37"],
  ],
  priere: [
    ["C'est l'heure de prier", "Prends un moment avec Dieu."],
    ["Ton moment de prière", "Quelques minutes au calme, avec Lui."],
    ["Un temps pour prier", "Confie-lui ce que tu portes aujourd'hui."],
  ],
  lecture: [
    ["C'est l'heure de lire ta Bible", "Un passage, même court : ta Bible t'attend."],
    ["Ton moment de lecture", "Ouvre ta Bible, ne serait-ce que pour quelques versets."],
    ["La Parole t'attend", "Un moment de lecture, rien que pour toi."],
  ],
  essai: [["Les rappels sont bien branchés", "C'est un essai : tout est bien relié jusqu'à ton téléphone."]],
  /* La confirmation, une seule fois, quand un rappel est allumé sur ce téléphone. */
  bienvenue: [["Les rappels sont activés", "C'est ici qu'ils arriveront."]],
};
const MOTS_EN = {
  serie: [
    ["Your {n}-day flame goes out tonight", "One game before midnight, and it keeps going."],
    ["{n} days in a row — and tonight?", "Three minutes is enough to keep your flame."],
    ["Don't let your {n} days slip away", "One game, even a short one, keeps your flame alight."],
  ],
  defi: [
    ["A game today?", "Three minutes is enough, and the day counts."],
    ["Your flame is waiting", "One quick game, and the day counts for it."],
    ["Three minutes, a few questions", "Today's game hasn't been played yet."],
    ["Shall we play today?", "One game to make your flame shine."],
  ],
  revoir: [
    ["{n} question{s} to review today", "These are your past mistakes. That's where you grow."],
    ["Your memory asks for {n} question{s}", "Reviewed today, they won't come back for three days."],
    ["You have {n} question{s} to go over", "Two minutes, and they move up a level."],
  ],
  absence: [
    ["It's been {j} days", "Your progress is intact. Pick up whenever you like."],
    ["We miss you", "Your progress is waiting, exactly where you left it."],
    ["Your questions are waiting", "Nothing is lost — it's all still here."],
  ],
  verset: [
    ["A verse for the week", "“Thy word is a lamp unto my feet, and a light unto my path.” Psalm 119:105"],
    ["A verse for the week", "“Let every thing that hath breath praise the LORD. Praise ye the LORD.” Psalm 150:6"],
    ["A verse for the week", "“I can do all things through Christ which strengtheneth me.” Philippians 4:13"],
    ["A verse for the week", "“The LORD is my shepherd; I shall not want.” Psalm 23:1"],
    ["A verse for the week", "“The LORD bless thee, and keep thee:” Numbers 6:24"],
    ["A verse for the week", "“For with God nothing shall be impossible.” Luke 1:37"],
  ],
  priere: [
    ["Time to pray", "Take a moment with God."],
    ["Your prayer time", "A few quiet minutes with Him."],
    ["A time to pray", "Bring Him what you are carrying today."],
  ],
  lecture: [
    ["Time to read your Bible", "A passage, even a short one: your Bible is waiting."],
    ["Your reading time", "Open your Bible, even for just a few verses."],
    ["The Word is waiting", "A moment of reading, just for you."],
  ],
  essai: [["Reminders are all set", "This is a test: everything is connected, right up to your phone."]],
  bienvenue: [["Reminders are on", "This is where they'll arrive."]],
};
const MOTS_ES = {
  serie: [
    ["Tu llama de {n} días se apaga esta noche", "Una partida antes de medianoche, y sigue."],
    ["{n} días seguidos, ¿y esta noche?", "Tres minutos bastan para mantener tu llama."],
    ["No dejes escapar tus {n} días", "Una partida, aunque sea corta, mantiene tu llama encendida."],
  ],
  defi: [
    ["¿Una partida hoy?", "Tres minutos bastan, y el día cuenta."],
    ["Tu llama te espera", "Una partida rápida, y el día cuenta para ella."],
    ["Tres minutos, unas preguntas", "Tu partida del día aún no se ha jugado."],
    ["¿Jugamos hoy?", "Una partida para hacer brillar tu llama."],
  ],
  revoir: [
    ["{n} pregunta{s} por repasar hoy", "Son tus errores pasados. Ahí es donde se progresa."],
    ["Tu memoria pide {n} pregunta{s}", "Repasadas hoy, no volverán hasta dentro de tres días."],
    ["Tienes {n} pregunta{s} por retomar", "Dos minutos, y suben un nivel."],
  ],
  absence: [
    ["Han pasado {j} días", "Tu progreso está intacto. Retoma cuando quieras."],
    ["Te echamos de menos", "Tu progreso te espera, justo donde lo dejaste."],
    ["Tus preguntas te esperan", "No se ha perdido nada: todo sigue aquí."],
  ],
  verset: [
    ["Un versículo para la semana", "«Lámpara es á mis pies tu palabra, y lumbrera á mi camino.» Salmo 119:105"],
    ["Un versículo para la semana", "«Todo lo que respira alabe á JAH. Aleluya.» Salmo 150:6"],
    ["Un versículo para la semana", "«Todo lo puedo en Cristo que me fortalece.» Filipenses 4:13"],
    ["Un versículo para la semana", "«Jehová es mi pastor; nada me faltará.» Salmo 23:1"],
    ["Un versículo para la semana", "«Jehová te bendiga, y te guarde:» Números 6:24"],
    ["Un versículo para la semana", "«Porque ninguna cosa es imposible para Dios.» Lucas 1:37"],
  ],
  priere: [
    ["Es hora de orar", "Tómate un momento con Dios."],
    ["Tu momento de oración", "Unos minutos en calma, con Él."],
    ["Un tiempo para orar", "Confíale lo que llevas hoy."],
  ],
  lecture: [
    ["Es hora de leer tu Biblia", "Un pasaje, aunque sea corto: tu Biblia te espera."],
    ["Tu momento de lectura", "Abre tu Biblia, aunque sea para unos versículos."],
    ["La Palabra te espera", "Un momento de lectura, solo para ti."],
  ],
  essai: [["Los recordatorios están listos", "Es una prueba: todo está conectado hasta tu teléfono."]],
  bienvenue: [["Los recordatorios están activados", "Aquí es donde llegarán."]],
};

/* La langue du joueur, lue dans le miroir ; le français si elle manque (un
   miroir écrit avant la v326 n'en porte pas). */
const MOTS_LANGUE = { fr: MOTS, en: MOTS_EN, es: MOTS_ES };
/* La formulation du jour est TIRÉE DU JOUR, pas au hasard : deux envois du
   même jour (une reprise du service d'envoi, par exemple) donnent le même
   texte, et deux jours de suite en donnent deux différents. */
function motsDuJour(genre, jour, langue){
  const lot = (typeof MOTS_LANGUE !== "undefined" && MOTS_LANGUE[langue]) || MOTS;
  const liste = lot[genre] || lot.defi;
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
    const langue = etat && etat.langue;
    const montrer = (genre, m) => self.registration.showNotification(m[0], {
      body: m[1], icon: "./icon-192.png", badge: "./icon-192.png",
      tag: genre, renotify: false, requireInteraction: false, data: { url: "./" },
    });
    /* ===== « ESSAYER CHAQUE RAPPEL » (v327) =====
       Demandé par la Modération pour CE téléphone : chaque sorte de rappel,
       avec ses vrais mots et des valeurs d'exemple (une flamme de 3 jours,
       3 questions, 7 jours d'absence). Il passe outre tous les garde-fous —
       c'est un essai — et prend une étiquette à part : il ne remplace aucun
       vrai rappel, ne consomme pas le « déjà prévenu aujourd'hui », et les
       sept s'empilent au lieu de s'effacer l'un l'autre. */
    if(charge.essai === true && ["serie", "defi", "revoir", "verset", "absence", "priere", "lecture"].indexOf(charge.genre) >= 0){
      const val = { n: (charge.n | 0) || 3, j: (charge.jours | 0) || 7 };
      const m = motsDuJour(charge.genre, aujourdhui, langue);
      await self.registration.showNotification(remplir(m[0], val), {
        body: remplir(m[1], val), icon: "./icon-192.png", badge: "./icon-192.png",
        tag: "essai-" + charge.genre, renotify: true, requireInteraction: false, data: { url: "./" },
      });
      return;
    }
    /* ===== PRIÈRE ET LECTURE : L'HEURE QUE LE JOUEUR A CHOISIE (v326) =====
       Ce ne sont pas des rappels du JEU : le joueur les a demandés, à une
       heure qu'il a choisie. Ils ne passent donc ni par « actif » (les
       rappels du jeu) ni par le plafond d'un rappel du jeu par jour
       (« prevenu »), et ne le consomment pas. Le serveur ne les envoie qu'une
       fois par jour (priere_le, lecture_le) ; l'appareil vérifie seulement
       qu'ils sont toujours allumés ICI — éteints entre-temps, ils se taisent.
       (v327) SEULEMENT s'ils ont été éteints ici (-1). Un miroir absent ou
       ancien (stockage vidé par iOS, réglage d'avant la v326) ne dit rien
       contre le serveur, qui a l'heure : on montre. Se taire là faisait
       manquer le rendez-vous, et un téléphone qui reçoit sans rien montrer
       finit par perdre son abonnement. */
    if(charge.genre === "priere" || charge.genre === "lecture"){
      const h = etat && etat[charge.genre];
      if(typeof h === "number" && h < 0) return;
      await montrer(charge.genre, motsDuJour(charge.genre, aujourdhui, langue));
      return;
    }
    /* L'ESSAI PASSE OUTRE LES GARDE-FOUS — c'est tout son intérêt : il prouve
       la chaîne entière (clés, signature, service d'envoi, appareil) sans
       attendre le soir où un vrai rappel aurait lieu, et il s'affiche sur
       tout appareil abonné, rappels du jeu allumés ou non (prière, lecture).
       Il ne consomme pas le « déjà prévenu aujourd'hui » : un essai ne doit
       pas voler le rappel du jour. (Avant la v326, il passait APRÈS ces
       garde-fous, contrairement à ce que disait son commentaire.) */
    /* (v326) « bienvenue » est l'essai qu'un joueur reçoit, une fois, en
       allumant un rappel : même chemin, ses propres mots. */
    if(charge.genre === "essai" || charge.genre === "bienvenue"){
      await montrer(charge.genre, motsDuJour(charge.genre, aujourdhui, langue));
      return;
    }
    /* Les garde-fous, dans l'ordre où ils comptent :
       - le joueur a bien accepté ;
       - on ne l'a pas déjà prévenu aujourd'hui ;
       - et, motif par motif, la raison tient-elle ENCORE à cet instant ?
       Ce dernier point est la raison d'être de tout ce qui suit : entre la
       décision du serveur et l'arrivée de l'envoi, le joueur a pu jouer. */
    if(!etat || !etat.actif) return;
    if(etat.prevenu === aujourdhui) return;      // un seul rappel par jour, tous motifs confondus

    /* (v326) priere, lecture, essai et bienvenue sont servis plus haut ; ils restent nommés
       ici pour que la liste dise tout ce que le serveur peut envoyer. */
    const CONNUS = ["serie", "defi", "revoir", "absence", "verset", "priere", "lecture", "essai", "bienvenue"];
    const genre = CONNUS.indexOf(charge.genre) >= 0 ? charge.genre : "serie";
    let titre = "", corps = "";
    const val = { n: 0, j: 0 };

    if(genre === "serie"){
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
      const m = motsDuJour(genre, aujourdhui, langue);
      titre = remplir(m[0], val);
      corps = remplir(m[1], val);
    }

    await montrer(genre, [titre, corps]);
    /* on note le jour : même si un second envoi arrivait, il resterait muet. */
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
