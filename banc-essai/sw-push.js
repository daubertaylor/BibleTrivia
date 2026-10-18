/* ====== BANC « CE QUE LE TÉLÉPHONE MONTRE QUAND UN RAPPEL ARRIVE » (v327) ======
   Le service worker est chargé TEL QUEL (sw.js), dans un bac à sable où
   « self.registration.showNotification » note ce qu'on lui demande, et où
   IndexedDB rend le miroir que le jeu y a posé. On lui présente chaque sorte
   d'envoi, comme la fonction les envoie, et on lit ce qui s'affiche :
     1. « Essayer chaque rappel » : les sept sortes s'affichent, avec leurs
        vrais mots, des valeurs d'exemple (aucun trou « {n} » qui reste), une
        étiquette à part (« essai-… ») — même rappels du jeu éteints, même
        déjà prévenu aujourd'hui ;
     2. la prière et la lecture : montrées si le miroir les dit allumées, ET
        s'il ne dit rien (miroir vide, ancien) — c'est le serveur qui a
        l'heure ; tues seulement si elles ont été éteintes ICI (-1) ;
     3. les vrais rappels du jeu gardent leurs garde-fous : rappels du jeu
        éteints → rien ; déjà prévenu aujourd'hui → rien ;
     4. l'essai et la bienvenue passent toujours.
   Usage : node banc-essai/sw-push.js */
const fs = require('fs');
const path = require('path');
const vm = require('vm');
let ko = 0;
const dire = (bon, txt) => { if (!bon) ko++; console.log('  ' + (bon ? 'OK  ' : 'KO  ') + txt); };

const SRC = fs.readFileSync(path.join(__dirname, '..', 'sw.js'), 'utf8');
function bac(miroir) {
  const montres = [], ecoute = {};
  const idb = {
    open() {
      const r = {};
      setTimeout(() => {
        r.result = {
          objectStoreNames: { contains: () => true },
          transaction() { return { objectStore() { return {
            get() { const g = {}; setTimeout(() => { g.result = miroir; g.onsuccess && g.onsuccess(); }, 0); return g; },
            put() { return {}; },
          }; } }; },
        };
        r.onsuccess && r.onsuccess();
      }, 0);
      return r;
    },
  };
  const self = {
    registration: { scope: 'https://exemple.github.io/BibleTrivia/', showNotification: (t, o) => { montres.push({ titre: t, corps: o && o.body, tag: o && o.tag }); return Promise.resolve(); } },
    addEventListener: (nom, fn) => { ecoute[nom] = fn; },
    skipWaiting() {}, clients: { claim() {} },
  };
  const ctx = { self, indexedDB: idb, caches: { open: () => Promise.resolve({}), keys: () => Promise.resolve([]), match: () => Promise.resolve(null) },
    clients: { matchAll: () => Promise.resolve([]) }, fetch: () => Promise.reject(new Error('hors ligne')), URL, Request: function(){}, Response: function(){},
    console, setTimeout, clearTimeout, Promise, Date, Math, JSON };
  vm.createContext(ctx);
  vm.runInContext(SRC, ctx);
  const recevoir = async (charge) => {
    let attente = null;
    ecoute.push({ data: { json: () => charge }, waitUntil: (p) => { attente = p; } });
    await attente;
    return montres.splice(0);
  };
  return { recevoir };
}
const AUJ = (dec) => { const d = new Date(Date.now() + dec * 60000); return d.getUTCFullYear() + '-' + String(d.getUTCMonth() + 1).padStart(2, '0') + '-' + String(d.getUTCDate()).padStart(2, '0'); };

(async () => {
  /* 1. Essayer chaque rappel : miroir « rappels du jeu éteints, déjà prévenu
        aujourd'hui, prière éteinte » — rien de tout ça ne doit le retenir. */
  const dec = 120;
  const fermé = { actif: false, prevenu: AUJ(dec), priere: -1, lecture: -1, serie: 0, dernier: null, vu: null, revoir: 0, langue: 'fr' };
  const SEPT = [['serie', { n: 3 }], ['defi', {}], ['revoir', { n: 3 }], ['verset', {}], ['absence', { jours: 7 }], ['priere', {}], ['lecture', {}]];
  let b = bac(fermé);
  const vus = [];
  for (const [genre, plus] of SEPT) vus.push(...await b.recevoir(Object.assign({ genre, decalage: dec, essai: true }, plus)));
  dire(vus.length === 7, '1. essayer chaque rappel : ' + vus.length + ' notification(s) sur 7, même rappels du jeu éteints et déjà prévenu');
  dire(vus.every((v, i) => v.tag === 'essai-' + SEPT[i][0]), '   chacune sous son étiquette à part (' + vus.map(v => v.tag).join(', ') + ')');
  dire(vus.every(v => v.titre && v.corps && !/[{}]|undefined|NaN/.test(v.titre + v.corps)), '   leurs vrais mots, sans trou : « ' + (vus[0] && vus[0].titre) + ' » …');
  /* Toutes les formulations de la flamme disent son chiffre ; celles de
     l'absence pas toutes (« Tu nous manques ») : on lit la flamme. */
  const serie = vus[0] && (vus[0].titre + ' ' + vus[0].corps);
  dire(/\b3\b/.test(serie || ''), '   avec des valeurs d\'exemple : une flamme de 3 jours (« ' + (vus[0] && vus[0].titre) + ' »)');
  b = bac(Object.assign({}, fermé, { langue: 'es' }));
  const es = await b.recevoir({ genre: 'priere', decalage: dec, essai: true });
  dire(es.length === 1 && !/prier|Prière/.test(es[0].titre + es[0].corps), '   dans la langue du joueur (es : « ' + (es[0] && es[0].titre) + ' »)');

  /* 2. La prière et la lecture, sans « essai » */
  for (const [nom, miroir, montre] of [
    ['allumée ici (07:00)', { priere: 420, lecture: 1260, langue: 'fr', actif: false }, true],
    ['miroir vide (stockage vidé)', null, true],
    ['miroir d\'avant la v326 (sans heure)', { actif: true, serie: 4, langue: 'fr' }, true],
    ['éteinte ici (-1)', { priere: -1, lecture: -1, langue: 'fr', actif: true }, false],
  ]) {
    b = bac(miroir);
    const m = await b.recevoir({ genre: 'priere', decalage: dec });
    dire((m.length === 1) === montre && (!montre || m[0].tag === 'priere'), '2. prière, ' + nom + ' : ' + (m.length ? 'montrée' : 'tue') + (montre ? '' : ' (le joueur l\'a éteinte)'));
  }

  /* 3. Les vrais rappels du jeu gardent leurs garde-fous */
  b = bac({ actif: false, serie: 5, dernier: AUJ(dec - 1440), vu: AUJ(dec - 1440), langue: 'fr' });
  dire(!(await b.recevoir({ genre: 'serie', decalage: dec })).length, '3. une vraie flamme, rappels du jeu éteints : rien');
  b = bac({ actif: true, prevenu: AUJ(dec), serie: 5, dernier: AUJ(dec - 1440), vu: AUJ(dec - 1440), langue: 'fr' });
  dire(!(await b.recevoir({ genre: 'serie', decalage: dec })).length, '   déjà prévenu aujourd\'hui : rien');
  b = bac({ actif: true, serie: 5, dernier: AUJ(dec - 1440), vu: AUJ(dec - 1440), langue: 'fr' });
  const fl = await b.recevoir({ genre: 'serie', decalage: dec });
  dire(fl.length === 1 && fl[0].tag === 'serie' && /\b5\b/.test(fl[0].titre + fl[0].corps), '   flamme de 5 jours, pas encore jouée aujourd\'hui : montrée, avec SON chiffre (« ' + (fl[0] && fl[0].titre) + ' »)');

  /* 4. L'essai et la bienvenue passent toujours */
  for (const genre of ['essai', 'bienvenue']) {
    b = bac(fermé);
    const m = await b.recevoir({ genre, decalage: dec });
    dire(m.length === 1 && m[0].tag === genre, '4. ' + genre + ' : montré');
  }

  console.log(ko === 0 ? '\n  OK — chaque rappel s\'affiche quand il le doit, et se tait seulement quand le joueur l\'a voulu' : '\n  ' + ko + ' défaut(s)');
  process.exit(ko === 0 ? 0 : 1);
})().catch((e) => { console.error(e); process.exit(1); });
