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
let MAINTENANT = Date.parse('2026-03-15T18:00:00Z');
const vraiNow = Date.now;
Date.now = () => MAINTENANT;

/* ---- les doublures ---- */
const envois = [];
const webpush = {
  setVapidDetails(){},
  sendNotification(abo, corps){
    if (REFUSES.has(abo.endpoint)) { const e = new Error('Received unexpected response code'); e.statusCode = 403; e.body = 'the VAPID credentials in the authorization header do not correspond to the credentials used to create the subscription (https://push.exemple/abc)'; return Promise.reject(e); }
    envois.push({ qui: abo.endpoint, charge: JSON.parse(corps) }); return Promise.resolve();
  },
};
let LIGNES = [];
/* (v326) La clé interne que installer.sql fabrique dans public.rappels_reglage,
   et que la tâche envoie dans l'en-tête « x-rappels ». */
const CLE = 'b'.repeat(16) + '0123456789abcdef'.repeat(4);
let REGLAGE = [{ id:1, cle:CLE }];
/* Un service d'envoi qui refuse un appareil précis (403 : signature refusée). */
const REFUSES = new Set();
const createClient = () => ({
  from(table){
    if (table === 'rappels_reglage') return {
      select(){ let l = REGLAGE; const q = {
        eq(col, v){ l = l && l.filter(x => x[col] === v); return q; },
        then(r){ return Promise.resolve(REGLAGE === null ? { data:null, error:{ message:'relation "public.rappels_reglage" does not exist' } } : { data:l, error:null }).then(r); },
      }; return q; },
    };
    return {
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
    /* (v326) la fonction note le jour de chaque envoi (jeu_le, priere_le,
       lecture_le) : la doublure l'écrit vraiment dans la table, pour que le
       passage suivant le lise — c'est tout l'objet de ces dates. */
    update(valeurs){ return { eq(col, v){
      for (const l of LIGNES) if (l[col] === v) Object.assign(l, valeurs);
      return Promise.resolve({ error:null });
    } }; },
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
  /* ---- (v326) la prière et la lecture, à l'heure choisie — il est 19 h chez eux ---- */
  ['prière à 19 h',                     { serie:0, dernier:null, vu:j(0), decalage:SOIR, priere:1140 }, 'priere'],
  ['prière à 18 h 30 (dans l’heure)',   { serie:0, dernier:null, vu:j(0), decalage:SOIR, priere:1110 }, 'priere'],
  ['prière à 17 h 55 (l’heure est passée)', { serie:0, dernier:null, vu:j(0), decalage:SOIR, priere:1075 }, null],
  ['prière à 19 h 05 (pas encore)',     { serie:0, dernier:null, vu:j(0), decalage:SOIR, priere:1145 }, null],
  ['prière déjà partie aujourd’hui',    { serie:0, dernier:null, vu:j(0), decalage:SOIR, priere:1140, priere_le:j(0) }, null],
  ['prière partie hier, 19 h',          { serie:0, dernier:null, vu:j(0), decalage:SOIR, priere:1140, priere_le:j(1) }, 'priere'],
  ['lecture à 19 h',                    { serie:0, dernier:null, vu:j(0), decalage:SOIR, lecture:1140 }, 'lecture'],
  ['prière et lecture à 19 h',          { serie:0, dernier:null, vu:j(0), decalage:SOIR, priere:1140, lecture:1140 }, 'priere+lecture'],
  ['lecture à 12 h, il est midi',       { serie:0, dernier:null, vu:jm(0), decalage:MIDI, lecture:720 }, 'lecture'],
  /* ---- (v326) les rappels du jeu, éteints ou déjà partis ---- */
  ['rappels du jeu éteints, série en jeu', { serie:3, dernier:j(1), vu:j(1), decalage:SOIR, jeu:false }, null],
  ['rappels du jeu éteints, prière à 19 h', { serie:3, dernier:j(1), vu:j(1), decalage:SOIR, jeu:false, priere:1140 }, 'priere'],
  ['série en jeu, déjà prévenu aujourd’hui', { serie:3, dernier:j(1), vu:j(1), decalage:SOIR, jeu_le:j(0) }, null],
  ['série en jeu, et prière à 19 h',    { serie:3, dernier:j(1), vu:j(1), decalage:SOIR, priere:1140 }, 'priere+serie'],
];

/* Les colonnes de la v326, telles que la table les donne à la fonction. */
const V326 = { jeu:true, priere:null, lecture:null, jeu_le:null, priere_le:null, lecture_le:null };
LIGNES = CAS.map(([nom, l], i) => Object.assign({ endpoint:'appareil-' + i, abonnement:{ endpoint:'appareil-' + i }, revoir:0 }, V326, l));

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

  /* Le handler lit le corps de la requête (pour l'essai) : on lui en donne une.
     (v326) Et des en-têtes : par défaut ceux de la TÂCHE, qui porte la clé
     interne ; « sansCle » est l'appel du jeu, ou d'un inconnu. */
  const requete = (corps, entetes = { 'x-rappels': CLE }, methode = 'POST') => ({
    method: methode,
    headers: new Headers(entetes),
    json: () => corps === undefined ? Promise.reject(new Error('pas de corps')) : Promise.resolve(corps),
  });
  const sansCle = (corps) => requete(corps, { authorization:'Bearer sb_publishable_exemple', apikey:'sb_publishable_exemple' });
  const rep = await handler(requete());
  if (rep && rep.status === 400) {
    console.log('  LA FONCTION A REFUSÉ DES CLÉS POURTANT VALIDES :', JSON.stringify(await rep.json()));
    process.exit(1);
  }
  Date.now = vraiNow;
  let ok = true;
  console.log('  cas                                       attendu      reçu');
  CAS.forEach(([nom, , attendu], i) => {
    /* (v326) TOUT ce qui part vers cet appareil, dans l'ordre : la prière et
       la lecture s'ajoutent au rappel du jeu, elles ne le remplacent pas.
       L'absence dit AUSSI combien de jours : c'est ce qui distingue les trois
       paliers, et les confondre laisserait passer un rappel au mauvais jour. */
    const partis = envois.filter(x => x.qui === 'appareil-' + i);
    const recu = !partis.length ? 'rien' : partis.map(e =>
      e.charge.genre === 'absence' ? 'absence' + e.charge.jours : (e.charge.genre || 'serie')).join('+');
    const veut = attendu || 'rien';
    const bon = recu === veut;
    if (!bon) ok = false;
    console.log('  ' + nom.padEnd(40) + veut.padEnd(12) + recu + (bon ? '' : '   <-- NON'));
  });
  console.log('\n  ' + envois.length + ' envoi(s) pour ' + CAS.length + ' joueurs');

  /* ===== (v326) TOUTES LES CINQ MINUTES, RIEN NE SE RÉPÈTE =====
     La tâche passe désormais toutes les cinq minutes. Les passages suivants
     tombent toujours dans l'heure du soir, et dans l'heure de chaque prière :
     sans les dates d'envoi (jeu_le, priere_le, lecture_le), tout repartirait.
     Aucun appareil ne doit recevoir deux fois la même chose ; et la prière
     de 19 h 05, qui n'était pas encore là au premier passage, part au
     passage de 19 h 05 — une fois. */
  const tous = envois.slice();
  envois.length = 0;
  for (const m of [5, 10, 30, 55]) { Date.now = () => MAINTENANT + m * 60000; await handler(requete()); }
  Date.now = vraiNow;
  const ensuite = envois.map(e => e.qui + ':' + e.charge.genre);
  const vus = {};
  for (const e of tous.concat(envois)) { const k = e.qui + ':' + e.charge.genre; vus[k] = (vus[k] || 0) + 1; }
  const repetes = Object.keys(vus).filter(k => vus[k] > 1);
  const iTard = CAS.findIndex(c => /19 h 05/.test(c[0]));
  const tard = ensuite.filter(k => k === 'appareil-' + iTard + ':priere').length;
  const autres = ensuite.filter(k => k !== 'appareil-' + iTard + ':priere');
  if (repetes.length || tard !== 1 || autres.length) ok = false;
  console.log('  quatre passages de plus dans l\'heure : ' + (repetes.length ? repetes.length + ' envoi(s) répété(s) <-- NON : ' + repetes.slice(0, 4).join(', ') : 'rien ne se répète')
    + ' ; la prière de 19 h 05 part ' + tard + ' fois' + (tard === 1 ? '' : ' <-- NON')
    + (autres.length ? ' ; envoi(s) inattendu(s) <-- NON : ' + autres.slice(0, 4).join(', ') : ''));

  /* ===== (v326) UNE TABLE D'AVANT LA V326 ===== sans jeu_le, la fonction
     ferait sonner un motif du soir à chaque passage de cinq minutes. Elle
     doit refuser de tourner, et dire quoi coller. */
  const sauve = LIGNES;
  LIGNES = [{ endpoint:'ancienne', abonnement:{ endpoint:'ancienne' }, serie:3, dernier:j(1), vu:j(1), revoir:0, decalage:SOIR }];
  envois.length = 0;
  Date.now = () => MAINTENANT;
  const repAncienne = await handler(requete());
  Date.now = vraiNow;
  const dit = repAncienne && repAncienne.status === 400 ? (await repAncienne.json()).details.join(' ') : '';
  const refuse = repAncienne && repAncienne.status === 400 && /installer\.sql/.test(dit) && !envois.length;
  if (!refuse) ok = false;
  console.log('  table sans les colonnes de la v326 : ' + (refuse ? 'refusée, « ' + dit.slice(0, 70) + '… »' : 'ACCEPTÉE <-- elle ferait sonner douze fois par heure'));
  LIGNES = sauve;

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

  /* ===== (v326) LA PORTE =====
     « Verify JWT » est désactivé (le jeu parle avec une clé publishable, qui
     n'est pas un JWT) : c'est donc la fonction qui garde la porte. Sans la clé
     interne ni la clé service_role, un passage normal et l'essai à TOUS sont
     refusés, sans rien envoyer ; l'état et l'essai d'UN téléphone restent
     ouverts, et ne disent jamais un secret. */
  console.log('\n  la porte                                   attendu      reçu');
  const PORTE = [];
  const porte = async (nom, req, veutStatut, verifie) => {
    envois.length = 0;
    const r = await handler(req);
    const corps = r.status === 200 && r.headers.get('content-type') === 'text/plain;charset=UTF-8' ? {} : await r.json().catch(() => ({}));
    const juste = r.status === veutStatut && (!verifie || verifie(corps, r));
    if (!juste) ok = false;
    PORTE.push(nom);
    console.log('  ' + nom.padEnd(42) + String(veutStatut).padEnd(13) + r.status + (juste ? '' : '   <-- NON ' + JSON.stringify(corps).slice(0, 120)));
    return corps;
  };
  Date.now = () => MAINTENANT;
  const nbAvant = LIGNES.length;
  await porte('passage sans clé', sansCle(), 401, (c) => !envois.length && c.erreur === 'accès' && c.version === 326);
  await porte('essai à tous, sans clé', sansCle({ essai:true }), 401, () => !envois.length);
  await porte('mauvaise clé interne', requete({ essai:true }, { 'x-rappels': CLE.replace(/.$/, '0') }), 401, () => !envois.length);
  REGLAGE = null;
  await porte('clé interne absente de la base', requete({ essai:true }), 401, (c) => !envois.length && /installer\.sql/.test(c.details.join(' ')));
  REGLAGE = [{ id:1, cle:CLE }];
  await porte('l’ancienne tâche (service_role)', requete({ essai:true }, { authorization:'Bearer cle-de-laboratoire' }), 200, (c) => c.essai === nbAvant && envois.length === nbAvant);
  await porte('la tâche, clé interne', requete({ essai:true }), 200, (c) => c.essai === nbAvant && c.version === 326);
  await porte('le navigateur demande la permission', requete(undefined, { 'access-control-request-headers':'authorization, x-client-info, apikey, content-type' }, 'OPTIONS'), 200,
    (c, r) => r.headers.get('access-control-allow-origin') === '*' && /apikey/.test(r.headers.get('access-control-allow-headers')) && !envois.length);
  await porte('l’état, demandé par le jeu', sansCle({ etat:true }), 200,
    (c, r) => c.version === 326 && c.vapid === 'ok' && c.pub === SECRETS.VAPID_PUBLIQUE && r.headers.get('access-control-allow-origin') === '*' && !envois.length);
  /* un essai pour MOI : un seul envoi, vers moi, et pas deux dans la minute */
  const moi = LIGNES[0].endpoint;
  for (const l of LIGNES) { l.essai_le = null; }
  await porte('essai pour moi', sansCle({ essai_moi: moi }), 200, (c) => c.envoye === true && envois.length === 1 && envois[0].qui === moi && envois[0].charge.genre === 'essai');
  await porte('essai pour moi, encore, dans la minute', sansCle({ essai_moi: moi }), 429, () => !envois.length);
  Date.now = () => MAINTENANT + 61000;
  await porte('essai pour moi, une minute après', sansCle({ essai_moi: moi, genre:'bienvenue' }), 200, () => envois.length === 1 && envois[0].charge.genre === 'bienvenue');
  Date.now = () => MAINTENANT;
  await porte('essai pour un téléphone inconnu', sansCle({ essai_moi: 'https://inconnu.exemple/x' }), 404, () => !envois.length);
  const lui = LIGNES[1].endpoint; REFUSES.add(lui);
  await porte('essai refusé par le service d’envoi', sansCle({ essai_moi: lui }), 502,
    (c) => c.code === 403 && /VAPID credentials/.test(c.details[0]) && !/https?:/.test(c.details[0]));
  /* le même refus pendant un passage : compté, et nommé dans la réponse */
  for (const l of LIGNES) { l.essai_le = null; }
  await porte('un refus pendant le passage', requete({ essai:true }), 200,
    (c) => c.echecs === 1 && c.dernier_echec && c.dernier_echec.code === 403 && c.essai === nbAvant - 1);
  REFUSES.clear();
  /* une table sans essai_le (installer.sql pas encore collé) */
  const sauveL = LIGNES; LIGNES = sauveL.map(l => { const c = { ...l }; delete c.essai_le; return c; });
  await porte('essai, table sans essai_le', sansCle({ essai_moi: moi }), 400, (c) => /installer\.sql/.test(c.details.join(' ')) && !envois.length);
  LIGNES = sauveL;
  /* et l'état ne dit jamais un secret, même mal posé */
  const bonS = { ...SECRETS };
  SECRETS.VAPID_SUJET = SECRETS.VAPID_PRIVEE;          // la clé privée collée dans la mauvaise case
  const cEtat = await porte('l’état, clé privée dans le sujet', sansCle({ etat:true }), 200,
    (c) => Array.isArray(c.vapid) && /VAPID_SUJET/.test(c.vapid.join(' ')) && !JSON.stringify(c).includes(bonS.VAPID_PRIVEE));
  Object.assign(SECRETS, bonS);
  Date.now = vraiNow;

  console.log(ok ? '\n  OK — les cinq motifs, la prière et la lecture à leur heure, rien de répété, une porte gardée, et un message clair quand les clés sont mauvaises' : '\n  ÉCHEC');
  process.exit(ok ? 0 : 1);
})();
