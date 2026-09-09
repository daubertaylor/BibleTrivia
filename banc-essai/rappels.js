/* ============ BANC « QUI REÇOIT UN RAPPEL, ET QUAND » ============
   Le vrai code du serveur, exécuté ici. La fonction Supabase est écrite en
   TypeScript pour Deno : on la TRANSPILE avec le compilateur TypeScript, on
   remplace ses deux dépendances (le client Supabase et l'envoi push) par des
   doublures qui NOTENT ce qu'on leur demande, on fige l'horloge, et on lui
   présente une table de joueurs fabriquée pour couvrir tous les cas.
   Ce n'est pas une copie de la règle : c'est la règle elle-même.

   Deux cas doivent produire un envoi, et deux seulement :
     - une série d'au moins deux jours, jouée hier, pas encore aujourd'hui ;
     - une absence de sept jours, puis de trente. Jamais plus.
   Le reste doit rester silencieux — et surtout le joueur qui joue TOUS LES
   JOURS sans toucher au Défi du jour : sa série vaut zéro et la date de son
   dernier défi est vieille de plusieurs mois. Le réveiller serait le pire des
   défauts possibles pour cette fonction.

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
const SOIR = 60;      // UTC+1 -> il est 19 h chez lui
const JOUR = 0;       // UTC   -> il est 18 h chez lui : trop tôt
const j = (n) => jourLocal(SOIR, -n);

const CAS = [
  ['série de 3, jouée hier',            { serie:3, dernier:j(1), vu:j(1), decalage:SOIR }, 'serie'],
  ['série de 3, déjà jouée aujourd’hui',{ serie:3, dernier:j(0), vu:j(0), decalage:SOIR }, null],
  ['série de 1, jouée hier',            { serie:1, dernier:j(1), vu:j(1), decalage:SOIR }, null],
  ['série de 3 mais perdue avant-hier', { serie:3, dernier:j(2), vu:j(2), decalage:SOIR }, null],
  ['absent depuis 7 jours',             { serie:0, dernier:j(40), vu:j(7),  decalage:SOIR }, 'absence7'],
  ['absent depuis 8 jours',             { serie:0, dernier:j(40), vu:j(8),  decalage:SOIR }, null],
  ['absent depuis 30 jours',            { serie:0, dernier:j(60), vu:j(30), decalage:SOIR }, 'absence30'],
  ['absent depuis 31 jours',            { serie:0, dernier:j(60), vu:j(31), decalage:SOIR }, null],
  ['absent depuis 200 jours',           { serie:0, dernier:j(300), vu:j(200), decalage:SOIR }, null],
  ['joue tous les jours, jamais le Défi',{ serie:0, dernier:j(120), vu:j(0), decalage:SOIR }, null],
  ['série en jeu, mais il est 18 h',    { serie:3, dernier:j(1), vu:j(1), decalage:JOUR }, null],
  ['absent 7 jours, mais il est 18 h',  { serie:0, dernier:j(40), vu:j(7), decalage:JOUR }, null],
  ['n’a jamais joué (vu vide)',         { serie:0, dernier:null, vu:null, decalage:SOIR }, null],
];

LIGNES = CAS.map(([nom, l], i) => Object.assign({ endpoint:'appareil-' + i, abonnement:{ endpoint:'appareil-' + i } }, l));

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

  const rep = await handler();
  if (rep && rep.status === 400) {
    console.log('  LA FONCTION A REFUSÉ DES CLÉS POURTANT VALIDES :', JSON.stringify(await rep.json()));
    process.exit(1);
  }
  Date.now = vraiNow;
  let ok = true;
  console.log('  cas                                       attendu      reçu');
  CAS.forEach(([nom, , attendu], i) => {
    const e = envois.find(x => x.qui === 'appareil-' + i);
    /* Un envoi sans « genre » est un rappel de série : c'est ce que faisait la
       version d'avant, et c'est ce que l'appareil comprend par défaut. */
    const recu = !e ? 'rien'
      : (e.charge.genre === 'absence' ? 'absence' + e.charge.jours : 'serie');
    const veut = attendu || 'rien';
    const bon = recu === veut;
    if (!bon) ok = false;
    console.log('  ' + nom.padEnd(40) + veut.padEnd(12) + recu + (bon ? '' : '   <-- NON'));
  });
  console.log('\n  ' + envois.length + ' envoi(s) pour ' + CAS.length + ' joueurs');

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
    const r = await handler();
    const refuse = r && r.status === 400;
    const dit = refuse ? (await r.json()).details.join(' ; ') : '(acceptée)';
    const juste = attendu ? (refuse && attendu.test(dit)) : !refuse;
    if (!juste) ok = false;
    console.log('  ' + nom.padEnd(42) + dit.slice(0, 70) + (juste ? '' : '   <-- NON'));
  }
  Object.keys(SECRETS).forEach(k => delete SECRETS[k]);
  Object.assign(SECRETS, bon);

  console.log(ok ? '\n  OK — les deux cas, rien d\'autre, et un message clair quand les clés sont mauvaises' : '\n  ÉCHEC');
  process.exit(ok ? 0 : 1);
})();
