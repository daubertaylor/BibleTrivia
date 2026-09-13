/* ============ BANC « QUI REÇOIT UN RAPPEL, ET QUAND » ============
   Le vrai code du serveur, exécuté ici. La fonction Supabase est écrite en
   TypeScript pour Deno : on la TRANSPILE avec le compilateur TypeScript, on
   remplace ses deux dépendances (le client Supabase et l'envoi push) par des
   doublures qui NOTENT ce qu'on leur demande, on fige l'horloge, et on lui
   présente une table de joueurs fabriquée pour couvrir tous les cas.
   Ce n'est pas une copie de la règle : c'est la règle elle-même.

   CINQ MOTIFS depuis la v219, chacun à son heure, et jamais deux le même jour
   pour le même joueur :
     serie    19 h  série d'au moins deux jours, jouée hier, pas aujourd'hui
     defi     19 h  Défi pas relevé aujourd'hui, mais relevé dans la semaine
     revoir   12 h  au moins une question arrive à échéance
     verset    9 h  le dimanche, à qui n'a pas disparu
     absence  19 h  exactement 3, 7 ou 30 jours sans jouer
   Le reste doit rester silencieux — et surtout le joueur qui joue TOUS LES
   JOURS sans toucher au Défi du jour : sa série vaut zéro et la date de son
   dernier défi est vieille de plusieurs mois. Le réveiller serait le pire des
   défauts possibles pour cette fonction. C'est d'ailleurs CE CAS qui a fait
   tomber la première écriture du motif « defi » (elle disait « a joué dans les
   14 derniers jours », ce qui l'incluait) : le banc l'a attrapé avant qu'il ne
   sorte, et la règle est devenue « fait le Défi d'habitude ».

   Usage : node banc-essai/rappels.js
*/
const fs = require('fs');
const path = require('path');
const ts = require('/opt/node22/lib/node_modules/typescript');

/* On peut viser une AUTRE version de la fonction, pour vérifier que le banc
   sait échouer : node banc-essai/rappels.js /chemin/vers/rappels.ts */
const SRC = process.argv[2] || path.join(__dirname, '..', 'notifications', 'rappels.ts');

/* ---- l'horloge, figée : 15 mars 2026, 18 h UTC ---- */
const MAINTENANT = Date.parse('2026-03-15T18:00:00Z');
const vraiNow = Date.now;
Date.now = () => MAINTENANT;

/* ---- les doublures ---- */
const envois = [];
const webpush = {
  setVapidDetails(){},
  sendNotification(abo, corps){ envois.push({ qui: abo.endpoint, charge: JSON.parse(corps) }); return Promise.resolve(); },
};
let LIGNES = [];
const createClient = () => ({
  from(){ return {
    /* Une requête qu'on peut filtrer AVANT de l'attendre, comme la vraie : la
       version d'avant demandait « .gte("serie", 2) » et le banc doit pouvoir
       l'exécuter telle quelle, sinon il ne compare rien. */
    select(){
      let lignes = LIGNES;
      const q = {
        gte(col, v){ lignes = lignes.filter(l => (l[col] | 0) >= v); return q; },
        eq(col, v){ lignes = lignes.filter(l => l[col] === v); return q; },
        then(r){ return Promise.resolve({ data: lignes, error: null }).then(r); },
      };
      return q;
    },
    delete(){ return { eq(){ return Promise.resolve({ error:null }); } }; },
  }; },
});

/* ---- les secrets, changeables d'un essai à l'autre ---- */
const SECRETS = {};
let handler = null;
globalThis.Deno = { env:{ get:(k)=> SECRETS[k] }, serve:(fn)=>{ handler = fn; } };
const source = fs.readFileSync(SRC, 'utf8')
  .replace(/^import .*$/gm, '');                 // les deux imports npm: sont remplacés par les doublures
const js = ts.transpileModule(source, { compilerOptions:{ module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
new Function('createClient', 'webpush', js)(createClient, webpush);

/* ---- la table de joueurs ---- */
const jourLocal = (decMin, decalageJours = 0) => {
  const d = new Date(MAINTENANT + decMin*60000 + decalageJours*86400000);
  const p = (n) => String(n).padStart(2, '0');
  return d.getUTCFullYear() + '-' + p(d.getUTCMonth()+1) + '-' + p(d.getUTCDate());
};
/* L'horloge est figée au DIMANCHE 15 mars 2026, 18 h UTC. Le décalage de
   chaque joueur sert donc à choisir l'heure qu'il est CHEZ LUI, et c'est ainsi
   qu'on éprouve les motifs à des heures différentes sans toucher à l'horloge. */
const SOIR  = 60;      // UTC+1 -> 19 h chez lui
const JOUR  = 0;       // UTC   -> 18 h : trop tôt pour le soir
const MIDI  = -360;    // UTC-6 -> 12 h : l'heure de « à revoir »
const MATIN = -540;    // UTC-9 ->  9 h, un dimanche : l'heure du verset
const j = (n) => jourLocal(SOIR, -n);
const jm = (n) => jourLocal(MIDI, -n);
const jd = (n) => jourLocal(MATIN, -n);

const CAS = [
  /* ---- la série ---- */
  ['série de 3, jouée hier',            { serie:3, dernier:j(1), vu:j(1), decalage:SOIR }, 'serie'],
  ['série de 3, déjà jouée aujourd’hui',{ serie:3, dernier:j(0), vu:j(0), decalage:SOIR }, null],
  ['série en jeu, mais il est 18 h',    { serie:3, dernier:j(1), vu:j(1), decalage:JOUR }, null],
  /* ---- le défi du jour : pour qui le fait D'HABITUDE ---- */
  ['série de 1, Défi fait hier',        { serie:1, dernier:j(1), vu:j(1), decalage:SOIR }, 'defi'],
  ['Défi fait il y a 2 jours',          { serie:3, dernier:j(2), vu:j(2), decalage:SOIR }, 'defi'],
  ['Défi fait il y a 7 jours',          { serie:0, dernier:j(7), vu:j(0), decalage:SOIR }, 'defi'],
  ['Défi fait il y a 8 jours',          { serie:0, dernier:j(8), vu:j(0), decalage:SOIR }, null],
  ['joue tous les jours, jamais le Défi',{ serie:0, dernier:j(120), vu:j(0), decalage:SOIR }, null],
  ['Défi du jour déjà fait, série de 1',{ serie:1, dernier:j(0), vu:j(0), decalage:SOIR }, null],
  /* ---- l'absence ---- */
  ['absent depuis 3 jours',             { serie:0, dernier:j(40), vu:j(3),  decalage:SOIR }, 'absence3'],
  ['absent depuis 4 jours',             { serie:0, dernier:j(40), vu:j(4),  decalage:SOIR }, null],
  ['absent depuis 7 jours',             { serie:0, dernier:j(40), vu:j(7),  decalage:SOIR }, 'absence7'],
  ['absent depuis 8 jours',             { serie:0, dernier:j(40), vu:j(8),  decalage:SOIR }, null],
  ['absent depuis 30 jours',            { serie:0, dernier:j(60), vu:j(30), decalage:SOIR }, 'absence30'],
  ['absent depuis 31 jours',            { serie:0, dernier:j(60), vu:j(31), decalage:SOIR }, null],
  ['absent depuis 200 jours',           { serie:0, dernier:j(300), vu:j(200), decalage:SOIR }, null],
  ['absent 7 jours, mais il est 18 h',  { serie:0, dernier:j(40), vu:j(7), decalage:JOUR }, null],
  /* ---- à revoir, à midi ---- */
  ['4 questions à revoir, il est midi', { serie:0, dernier:jm(1), vu:jm(1), revoir:4, decalage:MIDI }, 'revoir'],
  ['carnet vide, il est midi',          { serie:0, dernier:jm(1), vu:jm(1), revoir:0, decalage:MIDI }, null],
  ['4 questions à revoir, mais 19 h',   { serie:0, dernier:j(9),  vu:j(1),  revoir:4, decalage:SOIR }, null],
  /* ---- le verset, dimanche matin ---- */
  ['dimanche 9 h, joueur présent',      { serie:0, dernier:jd(3), vu:jd(2), decalage:MATIN }, 'verset'],
  ['dimanche 9 h, absent 60 jours',     { serie:0, dernier:jd(90), vu:jd(60), decalage:MATIN }, null],
  /* ---- le vide ---- */
  ['n’a jamais joué (vu vide)',         { serie:0, dernier:null, vu:null, decalage:SOIR }, null],
];

LIGNES = CAS.map(([nom, l], i) => Object.assign({ endpoint:'appareil-' + i, abonnement:{ endpoint:'appareil-' + i }, revoir:0 }, l));

/* Une VRAIE paire de clés, fabriquée ici : rien de secret n'entre dans le
   dépôt, et la vérification de cohérence a de quoi mordre. */
async function fabriquerPaire(){
  const kp = await crypto.subtle.generateKey({ name:'ECDSA', namedCurve:'P-256' }, true, ['sign','verify']);
  const pub = new Uint8Array(await crypto.subtle.exportKey('raw', kp.publicKey));
  const jwk = await crypto.subtle.exportKey('jwk', kp.privateKey);
  const b64 = (u) => Buffer.from(u).toString('base64').replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
  return { pub: b64(pub), priv: jwk.d };
}

(async () => {
  const paire = await fabriquerPaire();
  const autre = await fabriquerPaire();
  Object.assign(SECRETS, {
    VAPID_SUJET: 'mailto:taylor@exemple.fr',
    VAPID_PUBLIQUE: paire.pub,
    VAPID_PRIVEE: paire.priv,
    SUPABASE_URL: 'https://laboratoire.exemple',
    SUPABASE_SERVICE_ROLE_KEY: 'cle-de-laboratoire',
  });

  /* Le handler lit le corps de la requête (pour l'essai) : on lui en donne une. */
  const requete = (corps) => ({ json: () => corps === undefined ? Promise.reject(new Error('pas de corps')) : Promise.resolve(corps) });
  const rep = await handler(requete());
  if (rep && rep.status === 400) {
    console.log('  LA FONCTION A REFUSÉ DES CLÉS POURTANT VALIDES :', JSON.stringify(await rep.json()));
    process.exit(1);
  }
  Date.now = vraiNow;
  let ok = true;
  console.log('  cas                                       attendu      reçu');
  CAS.forEach(([nom, , attendu], i) => {
    const e = envois.find(x => x.qui === 'appareil-' + i);
    /* L'absence dit AUSSI combien de jours : c'est ce qui distingue les trois
       paliers, et les confondre laisserait passer un rappel au mauvais jour. */
    const recu = !e ? 'rien'
      : (e.charge.genre === 'absence' ? 'absence' + e.charge.jours : (e.charge.genre || 'serie'));
    const veut = attendu || 'rien';
    const bon = recu === veut;
    if (!bon) ok = false;
    console.log('  ' + nom.padEnd(40) + veut.padEnd(12) + recu + (bon ? '' : '   <-- NON'));
  });
  console.log('\n  ' + envois.length + ' envoi(s) pour ' + CAS.length + ' joueurs');

  /* ===== L'ESSAI ===== écrit à TOUT LE MONDE, sans regarder l'heure ni la
     série : c'est ce qui permet de voir la chaîne marcher le jour où on la
     branche, au lieu d'attendre un soir à 19 h pour découvrir un défaut. */
  envois.length = 0;
  const repEssai = await handler(requete({ essai: true }));
  const compte = await repEssai.json();
  /* Le décompte renvoyé par la fonction porte le NOM DU MOTIF, au singulier
     comme les quatre autres (serie, defi, revoir, verset, absence, essai) —
     c'était « essais » avant qu'il y en ait cinq. */
  const tousTouches = envois.length === CAS.length && compte.essai === CAS.length;
  const tousEssai = envois.every(e => e.charge.genre === 'essai');
  if (!tousTouches || !tousEssai) ok = false;
  console.log('  essai manuel : ' + envois.length + ' envoi(s) sur ' + CAS.length + ' joueurs, tous de genre « essai » : ' +
    (tousEssai ? 'oui' : 'NON') + (tousTouches ? '' : '   <-- IL EN MANQUE'));

  /* ===== ET QUAND LES SECRETS SONT MAL POSÉS ? =====
     Trois secrets à recopier à la main, donc trois occasions de se tromper. La
     bibliothèque d'envoi répond « no key set » dans les trois cas, ce qui
     n'aide personne. La fonction doit, elle, nommer le coupable. */
  console.log('\n  secrets mal posés                          message attendu');
  const ESSAIS = [
    ['nom du secret mal orthographié', { VAPID_PUBLIQUE: undefined }, /VAPID_PUBLIQUE est absente/],
    ['clé publique tronquée',          { VAPID_PUBLIQUE: paire.pub.slice(0, 80) }, /VAPID_PUBLIQUE fait 80 caract/],
    ['espace collé au bout',           { VAPID_PUBLIQUE: paire.pub + ' ' }, null],   /* doit PASSER : on rogne */
    ['clé privée d\'une autre paire',   { VAPID_PRIVEE: autre.priv }, /ne vont pas ensemble/],
    ['sujet sans mailto:',             { VAPID_SUJET: 'taylor@exemple.fr' }, /mailto:/],
  ];
  const bon = { ...SECRETS };
  for (const [nom, remplace, attendu] of ESSAIS) {
    Object.keys(SECRETS).forEach(k => delete SECRETS[k]);
    Object.assign(SECRETS, bon, remplace);
    Object.keys(remplace).forEach(k => { if (remplace[k] === undefined) delete SECRETS[k]; });
    const r = await handler(requete());
    const refuse = r && r.status === 400;
    const dit = refuse ? (await r.json()).details.join(' ; ') : '(acceptée)';
    const juste = attendu ? (refuse && attendu.test(dit)) : !refuse;
    if (!juste) ok = false;
    console.log('  ' + nom.padEnd(42) + dit.slice(0, 70) + (juste ? '' : '   <-- NON'));
  }
  Object.keys(SECRETS).forEach(k => delete SECRETS[k]);
  Object.assign(SECRETS, bon);

  console.log(ok ? '\n  OK — les cinq motifs, rien d\'autre, et un message clair quand les clés sont mauvaises' : '\n  ÉCHEC');
  process.exit(ok ? 0 : 1);
})();
