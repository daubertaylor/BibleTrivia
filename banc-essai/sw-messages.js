/* ====== BANC « UN MESSAGE DE GROUPE ARRIVE SUR LE TÉLÉPHONE » (v329) ======
   « Je veux aussi que tu fasses les notifications des messages. » Le service
   worker est chargé TEL QUEL (sw.js), dans un bac à sable qui tient, comme un
   téléphone, la liste des notifications affichées (une étiquette en remplace
   une autre, balayer en retire une) et les fenêtres du jeu. On lui présente
   les envois tels que la fonction les fait (notifications/rappels.ts) :
     1. un message : le nom du groupe en titre, « Benoît : … » dessous, UNE
        étiquette par groupe, et il sonne ;
     2. le deuxième, 5 s après : la même notification, complétée (« · 2
        nouveaux messages »), le dernier message dessous — sans resonner ;
     3. un troisième, 25 s après le dernier son : il resonne (« · 3 ») ;
     4. le même message rejoué : rien ne compte deux fois, rien ne sonne —
        mais une notification est reposée (un iPhone qui reçoit sans rien
        montrer finit par couper l'abonnement) ;
     5. balayée par le joueur : le message suivant repart de un ;
     6. un autre groupe : sa notification à lui, à côté ;
     7. une mention, une partie, un nom vide : « Benoît te mentionne : … »,
        « Benoît lance une partie », « Quelqu'un : … » ;
     8. dans la langue du joueur (anglais, espagnol) ;
     9. messages éteints ICI : rien ; miroir vide : montré (c'est le serveur
        qui sait à qui écrire) ; les rappels du jeu éteints n'y font rien ;
    10. la toucher : le jeu ouvert reçoit « ouvre ce groupe » puis passe au
        premier plan ; fermé, il s'ouvre sur ./?discussion=<groupe> ; un
        rappel touché garde l'ancien chemin (premier plan, rien d'autre).
   Usage : node banc-essai/sw-messages.js */
const fs = require('fs');
const path = require('path');
const vm = require('vm');
let ko = 0;
const dire = (bon, txt) => { if (!bon) ko++; console.log('  ' + (bon ? 'OK  ' : 'KO  ') + txt); };

const SRC = fs.readFileSync(path.join(__dirname, '..', 'sw.js'), 'utf8');
const G1 = '11111111-2222-4333-8444-555555555555', G2 = '99999999-8888-4777-8666-555555555555';
let HORLOGE = Date.parse('2026-10-18T18:00:00Z');
const FauxDate = class extends Date { constructor(...a){ if (a.length) super(...a); else super(HORLOGE); } static now(){ return HORLOGE; } };

function bac(miroir, fenetres) {
  const affichees = [], ecoute = {}, journal = [];
  const idb = { open() { const r = {}; setTimeout(() => { r.result = { objectStoreNames: { contains: () => true },
    transaction() { return { objectStore() { return { get() { const g = {}; setTimeout(() => { g.result = miroir; g.onsuccess && g.onsuccess(); }, 0); return g; }, put() { return {}; } }; } }; } };
    r.onsuccess && r.onsuccess(); }, 0); return r; } };
  /* Le tiroir du téléphone : une étiquette déjà là est REMPLACÉE. */
  const notif = (titre, o) => { const n = { title: titre, body: o.body, tag: o.tag, data: o.data, renotify: !!o.renotify,
    close(){ const i = affichees.indexOf(n); if (i >= 0) affichees.splice(i, 1); } }; return n; };
  const ouvertes = [];
  const clients = {
    matchAll: () => Promise.resolve(fenetres || []),
    openWindow: (u) => { ouvertes.push(u); return Promise.resolve({}); },
  };
  const self = {
    registration: {
      scope: 'https://exemple.github.io/BibleTrivia/',
      showNotification: (t, o) => { const n = notif(t, o || {});
        const i = affichees.findIndex(x => x.tag && x.tag === n.tag);
        if (i >= 0) affichees.splice(i, 1, n); else affichees.push(n);
        journal.push(n); return Promise.resolve(); },
      getNotifications: (f) => Promise.resolve(affichees.filter(x => !f || !f.tag || x.tag === f.tag)),
    },
    addEventListener: (nom, fn) => { ecoute[nom] = fn; },
    skipWaiting() {}, clients: { claim() {} },
  };
  const ctx = { self, indexedDB: idb, caches: { open: () => Promise.resolve({}), keys: () => Promise.resolve([]), match: () => Promise.resolve(null) },
    clients, fetch: () => Promise.reject(new Error('hors ligne')), URL, Request: function(){}, Response: function(){},
    console, setTimeout, clearTimeout, Promise, Date: FauxDate, Math, JSON, encodeURIComponent };
  vm.createContext(ctx);
  vm.runInContext(SRC, ctx);
  const recevoir = async (charge) => {
    let attente = null;
    ecoute.push({ data: { json: () => charge }, waitUntil: (p) => { attente = p; } });
    await attente;
    return journal.splice(0);
  };
  const toucher = async (n) => {
    let attente = null;
    ecoute.notificationclick({ notification: n, waitUntil: (p) => { attente = p; } });
    await attente;
    return ouvertes.splice(0);
  };
  return { recevoir, toucher, affichees };
}
const msg = (o) => Object.assign({ genre: 'message', groupe: G1, nom: 'Les amis', de: 'Benoît', texte: 'Salut !', partie: false, mention: false, decalage: 120 }, o);
const MIROIR = { actif: false, priere: -1, lecture: -1, messages: true, langue: 'fr' };

(async () => {
  /* 1. un message */
  let b = bac(MIROIR);
  let m = await b.recevoir(msg({ id: 101 }));
  const n1 = m[0] || {};
  dire(m.length === 1 && n1.title === 'Les amis' && n1.body === 'Benoît : Salut !' && n1.tag === 'grp-' + G1 && n1.renotify === true,
    '1. un message : « ' + n1.title + ' » / « ' + n1.body + ' », étiquette ' + n1.tag + ', il sonne (' + n1.renotify + ')');
  dire(n1.data && n1.data.url === './?discussion=' + G1 && n1.data.groupe === G1, '   il sait quelle discussion ouvrir (' + (n1.data && n1.data.url) + ')');

  /* 2. le deuxième, 5 s après */
  HORLOGE += 5000;
  m = await b.recevoir(msg({ id: 102, texte: 'On joue ce soir ?' }));
  const n2 = m[0] || {};
  dire(m.length === 1 && b.affichees.length === 1 && n2.title === 'Les amis · 2 nouveaux messages' && n2.body === 'Benoît : On joue ce soir ?' && n2.renotify === false,
    '2. le deuxième, 5 s après : une seule notification, complétée (« ' + n2.title + ' » / « ' + n2.body + ' »), sans resonner (' + n2.renotify + ')');

  /* 3. un troisième, 25 s après le dernier son */
  HORLOGE += 20000;
  m = await b.recevoir(msg({ id: 103, de: 'Jean Paul', texte: 'Moi oui' }));
  const n3 = m[0] || {};
  dire(n3.title === 'Les amis · 3 nouveaux messages' && n3.body === 'Jean Paul : Moi oui' && n3.renotify === true,
    '3. 25 s après le dernier son : il resonne (« ' + n3.title + ' », ' + n3.renotify + ')');

  /* 4. le même message rejoué */
  HORLOGE += 1000;
  m = await b.recevoir(msg({ id: 103, de: 'Jean Paul', texte: 'Moi oui' }));
  const n4 = m[0] || {};
  dire(m.length === 1 && n4.title === n3.title && n4.body === n3.body && n4.renotify === false && (n4.data || {}).n === 3,
    '4. le même message rejoué : reposé tel quel (« ' + n4.title + ' »), sans bruit, toujours 3');

  /* 5. balayée */
  b.affichees.splice(0);
  HORLOGE += 2000;
  m = await b.recevoir(msg({ id: 104, texte: 'Vous êtes là ?' }));
  const n5 = m[0] || {};
  dire(n5.title === 'Les amis' && n5.renotify === true, '5. balayée, puis un message : on repart de un (« ' + n5.title + ' »), et il sonne');

  /* 6. un autre groupe */
  m = await b.recevoir(msg({ id: 201, groupe: G2, nom: 'Étude du jeudi', de: 'Dora', texte: 'Psaume 23 ce soir' }));
  dire(b.affichees.length === 2 && b.affichees.some(x => x.tag === 'grp-' + G2 && x.title === 'Étude du jeudi') && b.affichees.some(x => x.tag === 'grp-' + G1),
    '6. un autre groupe : sa notification à lui, à côté (' + b.affichees.map(x => x.title).join(' | ') + ')');

  /* 7. mention, partie, nom vide */
  b = bac(MIROIR);
  const men = (await b.recevoir(msg({ id: 301, texte: '@Taylor tu viens ?', mention: true })))[0] || {};
  b = bac(MIROIR);
  const par = (await b.recevoir(msg({ id: 302, texte: '', partie: true })))[0] || {};
  b = bac(MIROIR);
  const vide = (await b.recevoir(msg({ id: 303, de: '', nom: '' })))[0] || {};
  dire(men.body === 'Benoît te mentionne : @Taylor tu viens ?', '7. une mention : « ' + men.body + ' »');
  dire(par.body === 'Benoît lance une partie', '   une partie : « ' + par.body + ' »');
  dire(vide.body === "Quelqu'un : Salut !" && vide.title === 'Yada', '   sans nom : « ' + vide.title + ' » / « ' + vide.body + ' »');

  /* 8. la langue du joueur */
  b = bac(Object.assign({}, MIROIR, { langue: 'en' }));
  const en1 = (await b.recevoir(msg({ id: 401, mention: true, texte: 'hi' })))[0] || {};
  HORLOGE += 3000;
  const en2 = (await b.recevoir(msg({ id: 402, partie: true, texte: '' })))[0] || {};
  b = bac(Object.assign({}, MIROIR, { langue: 'es' }));
  const es1 = (await b.recevoir(msg({ id: 501 })))[0] || {};
  HORLOGE += 3000;
  const es2 = (await b.recevoir(msg({ id: 502 })))[0] || {};
  dire(en1.body === 'Benoît mentioned you: hi' && en2.body === 'Benoît is starting a game' && en2.title === 'Les amis · 2 new messages',
    '8. en anglais : « ' + en1.body + ' », « ' + en2.title + ' » / « ' + en2.body + ' »');
  dire(es1.body === 'Benoît: Salut !' && es2.title === 'Les amis · 2 mensajes nuevos', '   en espagnol : « ' + es1.body + ' », « ' + es2.title + ' »');
  const tout = [n1, n2, n3, n4, n5, men, par, vide, en1, en2, es1, es2];
  dire(tout.every(x => x.title && x.body && !/[{}]|undefined|NaN|null/.test(x.title + x.body)), '   aucun trou dans les mots');

  /* 9. éteints ici, miroir vide, rappels du jeu éteints */
  b = bac(Object.assign({}, MIROIR, { messages: false }));
  dire(!(await b.recevoir(msg({ id: 601 }))).length, '9. messages éteints sur ce téléphone : rien');
  b = bac(null);
  dire((await b.recevoir(msg({ id: 602 }))).length === 1, '   miroir vide (stockage vidé) : montré');
  b = bac({ actif: false, prevenu: '2026-10-18', priere: -1, lecture: -1, langue: 'fr' });
  dire((await b.recevoir(msg({ id: 603 }))).length === 1, '   rappels du jeu éteints, déjà prévenu aujourd\'hui, miroir d\'avant la v329 : montré');

  /* 10. la toucher */
  const recus = [];
  let devant = 0;
  const fenetre = { postMessage: (x) => recus.push({ x, devant }), focus: () => { devant++; return Promise.resolve(fenetre); } };
  b = bac(MIROIR, [fenetre]);
  const n10 = (await b.recevoir(msg({ id: 701 })))[0];
  const ouv = await b.toucher(n10);
  dire(recus.length === 1 && recus[0].x.ouvrirGroupe === G1 && recus[0].devant === 0 && devant === 1 && !ouv.length,
    '10. jeu ouvert : « ouvre ce groupe » (' + (recus[0] && recus[0].x.ouvrirGroupe) + ') AVANT le premier plan, puis premier plan ; aucune fenêtre neuve');
  dire(!b.affichees.length, '    la notification touchée s\'en va');
  b = bac(MIROIR, []);
  const n11 = (await b.recevoir(msg({ id: 702 })))[0];
  const ouv2 = await b.toucher(n11);
  dire(ouv2.length === 1 && ouv2[0] === './?discussion=' + G1, '    jeu fermé : il s\'ouvre sur ' + ouv2[0]);
  recus.length = 0; devant = 0;
  b = bac(MIROIR, [fenetre]);
  const rap = (await b.recevoir({ genre: 'essai', decalage: 120 }))[0];
  await b.toucher(rap);
  dire(!recus.length && devant === 1, '    un rappel touché : premier plan, et rien d\'autre');
  /* Un premier plan refusé (fenêtre figée) : une fenêtre neuve sur la discussion. */
  const figee = { postMessage(){}, focus: () => Promise.reject(new Error('refusé')) };
  b = bac(MIROIR, [figee]);
  const n12 = (await b.recevoir(msg({ id: 703 })))[0];
  const ouv3 = await b.toucher(n12);
  dire(ouv3.length === 1 && ouv3[0] === './?discussion=' + G1, '    premier plan refusé : une fenêtre sur la discussion (' + ouv3[0] + ')');

  console.log(ko === 0 ? '\n  OK — un message arrive comme dans une messagerie : une notification par groupe, un son par rafale, et la toucher ouvre la discussion' : '\n  ' + ko + ' défaut(s)');
  process.exit(ko === 0 ? 0 : 1);
})().catch((e) => { console.error(e); process.exit(1); });
