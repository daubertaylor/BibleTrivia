/* ============ BANC « AUCUNE TRADUCTION NE MANQUE EN SILENCE » ============
   « Par contre lorsque c'est en anglais tout absolument tout doit être en
   anglais de A à Z. »

   POURQUOI UN BANC QUI LIT LE CODE, ET PAS L'ÉCRAN.
   banc-essai/langue.js compte ce qui reste en français À L'ÉCRAN. C'est
   nécessaire mais aveugle : il ne voit que les écrans qu'il sait atteindre.
   « La connexion au salon a échoué » ne sort qu'en cas de panne réseau,
   « Aucun gel en réserve » qu'après dix jours de suite — ces phrases-là ne
   s'affichent jamais devant un banc, et se déclarent donc traduites.

   DEUX PORTES, TOUTES DEUX STATIQUES ET INSTANTANÉES :

   1. TOUTE CLÉ APPELÉE EXISTE. T() est conçue pour retomber en français quand
      une clé manque — c'est ce qui garantit qu'il n'y a jamais de trou à
      l'écran, et c'est exactement ce qui rend l'oubli INVISIBLE. On compare
      donc la liste des T("…") écrits dans le code à la liste des clés posées
      dans TEXTES. (Les espaces insécables ne comptent pas, des deux côtés :
      T() cherche déjà sur une forme aplatie, le banc fait pareil.)

   2. AUCUNE PHRASE FRANÇAISE NE TRAÎNE HORS DE T(). Tout littéral qui a la
      tête d'une phrase française et qui n'est pas passé par T() ou Tf() est
      une phrase que l'anglais ne verra jamais. On écarte ce qui n'est pas de
      l'interface : les commentaires, le CSS, le dictionnaire lui-même, les
      1545 questions, les versets et les noms propres (livres, bibles,
      langues) — chacun a son propre chemin.

   SON ANGLE MORT, ET IL FAUT LE CONNAÎTRE. La seconde porte laisse passer une
   phrase qui EST au dictionnaire mais qu'on a oublié d'envelopper là où elle
   s'affiche : la clé existe, donc le banc la croit prise en charge. Je m'y
   suis fait prendre en posant quatre clés avant leur T() — le banc est passé
   au vert et le placeholder est resté en français. C'est le prix de la règle
   qui, elle, rattrape automatiquement toute table de données à venir.
   Le filet pour ce cas-là est banc-essai/langue.js, qui regarde l'écran.
   Les deux ensemble ne laissent presque rien.

       node banc-essai/traductions.js                 (le vrai index.html)
       node banc-essai/traductions.js <fichier.html>
*/
const fs = require('fs');
const path = require('path');
const SRC = process.argv[2] || path.join(__dirname, '..', 'index.html');
const src = fs.readFileSync(SRC, 'utf8');
let ko = 0;

/* --- outils communs --- */
const plat = (x) => String(x).replace(/[   ]/g, ' ');
const blanc = (t) => t.replace(/[^\n]/g, ' ');
function effacer(txt, debut, fin){
  const i = txt.indexOf(debut);
  if(i < 0) return txt;
  const j = txt.indexOf(fin, i + debut.length);
  if(j < 0) return txt;
  const k = j + fin.length;
  return txt.slice(0, i) + blanc(txt.slice(i, k)) + txt.slice(k);
}

/* ---------- 1. toute clé appelée existe ---------- */
const d0 = src.indexOf('const TEXTES = {');
const dEn = src.slice(src.indexOf('en: {', d0), src.indexOf('\n  },\n};', d0));
const cles = new Set();
/* ===== UNE CLÉ ÉCRITE DEUX FOIS, C'EST UNE TRADUCTION QUI EN EFFACE UNE =====
   Un objet JavaScript ne garde que la DERNIÈRE. Le jeu avait cinq clés en
   double, dont trois que j'avais ajoutées moi-même sans voir qu'elles
   existaient déjà cent lignes plus bas : « Dès qu'un autre joueur cherche… »
   était traduite deux fois, et c'est la seconde qui gagnait — en silence.
   Tant que les deux disent la même chose, personne ne le voit ; le jour où
   l'une est corrigée et pas l'autre, la correction n'a aucun effet et on
   cherche pendant une heure pourquoi. */
const doublons = [];
{
  const vues = new Map();
  for(const m of dEn.matchAll(/\n\s*"((?:[^"\\]|\\.)*)"\s*:\s*"((?:[^"\\]|\\.)*)"/g)){
    const k = JSON.parse('"' + m[1] + '"'), v = JSON.parse('"' + m[2] + '"');
    if(vues.has(k)) doublons.push([k, vues.get(k), v]);
    vues.set(k, v);
  }
}
for(const m of dEn.matchAll(/\n\s*"((?:[^"\\]|\\.)*)"\s*:/g)) cles.add(JSON.parse('"' + m[1] + '"'));
const clesPlates = new Set([...cles].map(plat));
/* UNE RÉFÉRENCE BIBLIQUE EST UNE CLÉ, PAS UN TEXTE. REFS_EN dit, pour chaque
   référence française, sa forme anglaise : « Ésaïe 64:8 » y est à gauche,
   comme identifiant. L'écrire n'est pas laisser traîner du français — c'est
   exactement le même cas que le dictionnaire lui-même, et on le traite pareil. */
{
  const i = src.indexOf('const REFS_EN = {');
  if(i >= 0){
    const j = src.indexOf('\n};', i);
    for(const m of src.slice(i, j).matchAll(/"((?:[^"\\]|\\.)*)"\s*:/g))
      clesPlates.add(plat(JSON.parse('"' + m[1] + '"')));
  }
}

/* ON NE LIT PAS UN APPEL AVEC UNE EXPRESSION RÉGULIÈRE.
   Première version : /Tf?\(\s*"([^"]*)"/. Elle ne voyait que le littéral
   COLLÉ à la parenthèse, donc elle ratait tout ce qui a la forme
   T(a ? "ceci" : "cela") — et elle prenait la seconde branche pour une phrase
   oubliée. On parcourt donc l'appel : de la parenthèse ouvrante jusqu'à sa
   fermante, en comptant les niveaux, on récolte TOUS les littéraux du chemin.
   zonesT garde aussi les bornes de chaque appel, pour que la seconde porte
   sache reconnaître ce qui est déjà à l'intérieur. */
const appels = new Set();
const zonesT = [];
function litteral(txt, i){
  /* txt[i] est un guillemet. Rend [valeur, index après le littéral]. */
  const q = txt[i]; let j = i + 1, out = '';
  while(j < txt.length){
    const c = txt[j];
    if(c === '\\'){ out += c + txt[j+1]; j += 2; continue; }
    if(c === q) return [out, j + 1];
    if(c === '\n' && q !== '`') return [null, i + 1];
    out += c; j++;
  }
  return [null, i + 1];
}
function decoder(brut, q){
  const e = q === '"' ? brut : brut.replace(/"/g, '\\"').replace(/\\'/g, "'");
  try{ return JSON.parse('"' + e + '"'); }catch(err){ return null; }
}
for(const m of src.matchAll(/\bTf?\(/g)){
  let i = m.index + m[0].length, prof = 1;
  const trouves = [];
  while(i < src.length && prof > 0){
    const c = src[i];
    if(c === '(' ){ prof++; i++; continue; }
    if(c === ')' ){ prof--; i++; continue; }
    if(c === '"' || c === "'" || c === '`'){
      const [v, suite] = litteral(src, i);
      if(v !== null && prof === 1){ const d = decoder(v, c); if(d !== null) trouves.push(d); }
      i = suite; continue;
    }
    if(c === ';' || c === '\n' && prof === 1 && src[i-1] === ';') break;
    i++;
  }
  trouves.forEach(t => appels.add(t));
  zonesT.push([m.index, i]);
}
zonesT.sort((a, b) => a[0] - b[0]);
const dansT = (pos) => zonesT.some(([a, b]) => pos >= a && pos < b);
const manque = [...appels].filter(k => !clesPlates.has(plat(k)));
console.log('  clés au dictionnaire : ' + cles.size + '   appels T() : ' + appels.size);
if(manque.length){
  ko++;
  console.log('  KO ' + manque.length + ' clé(s) appelée(s) sans traduction :');
  manque.slice(0, 12).forEach(k => console.log('       ' + JSON.stringify(k).slice(0, 110)));
} else console.log('  OK toute clé appelée a sa traduction');

if(doublons.length){
  ko++;
  console.log('  KO ' + doublons.length + ' clé(s) écrite(s) deux fois — la seconde efface la première :');
  doublons.slice(0, 8).forEach(([k, a, b]) => {
    console.log('       « ' + k.slice(0, 60) + ' »');
    console.log('           ignorée : ' + a.slice(0, 60));
    console.log('           retenue : ' + b.slice(0, 60));
  });
} else console.log('  OK aucune clé écrite deux fois');

/* ===== DEUX CLÉS QUI NE DIFFÈRENT QUE PAR UNE ESPACE INSÉCABLE =====
   « Beau début ! Chaque partie t'apprend un peu plus. » était au dictionnaire
   DEUX fois — une avec l'espace fine avant le point d'exclamation, une sans —
   et les deux n'y disaient pas la même chose : « A fine start! » d'un côté,
   « Fine start! » de l'autre. Comme T() cherche d'abord la forme EXACTE, c'est
   l'espace écrite dans MOTS_FIN qui décidait laquelle gagnait ; corriger
   l'autre n'avait aucun effet visible. Rien ne les dénonçait : ce sont bien
   deux clés distinctes, donc pas des doublons, et chacune est traduite, donc
   pas un trou. Elles ne se voient qu'en aplatissant les espaces — exactement
   ce que fait le repli de T(). */
{
  const parPlat = new Map();
  for(const m of dEn.matchAll(/"((?:[^"\\]|\\.)*)"\s*:\s*"((?:[^"\\]|\\.)*)"/g)){
    const k = plat(JSON.parse('"' + m[1] + '"')), v = JSON.parse('"' + m[2] + '"');
    if(!parPlat.has(k)) parPlat.set(k, []);
    parPlat.get(k).push(v);
  }
  const jumelles = [...parPlat].filter(([, v]) => v.length > 1);
  if(jumelles.length){
    ko++;
    console.log('  KO ' + jumelles.length + ' clé(s) en double à l\'espace insécable près :');
    jumelles.slice(0, 8).forEach(([k, v]) => {
      console.log('       « ' + k.slice(0, 60) + ' »');
      [...new Set(v)].forEach(x => console.log('           ' + x.slice(0, 70)));
    });
  } else console.log('  OK aucune clé en double à l\'espace insécable près');
}

/* ---------- 2. aucune phrase française hors de T() ---------- */
let net = src;
while(net.includes('<style>')) net = effacer(net, '<style>', '</style>');
/* Trois familles de commentaires, toutes écrites en français exprès :
   ceux du HTML, ceux du JS en bloc, et ceux en fin de ligne. Pour ces
   derniers on exige une espace devant les deux barres, ce qui laisse
   « https:// » tranquille. */
net = net.replace(/<!--[\s\S]*?-->/g, blanc);
net = net.replace(/\/\*[\s\S]*?\*\//g, blanc);
net = net.replace(/(^|\s)\/\/[^\n]*/g, (m, d) => d + blanc(m.slice(d.length)));
/* Les tables de CONTENU, chacune avec son propre chantier de traduction. */
for(const [a, b] of [['const TEXTES = {', '\n};'], ['const BANK = {', '\n  ]\n};'],
                     ['const VERSETS_ALT = {', '\n};'], ['const CITATIONS_ALT = {', '\n};'],
                     ['const VERSETS_EN = {', '\n};'], ['const HERO_VERSES = [', '\n];'],
                     ['const LIVRES_EN = {', '};'], ['const LIVRES_COURTS = {', '\n};'],
                     ['const LIVRES_COURTS_EN = {', '\n};'], ['const BIBLES = [', '\n];'],
                     ['const DRAPEAUX = {', '\n};'], ['const LANGUES = [', '\n];'],
                     ['const SCENES = [', '\n];'], ['const BIBLE_BOOKS = [', '\n];'],
                     ['const MINOR_PROPHETS = [', '];'], ['const TORAH = [', '];'],
                     ['const GOSPELS = [', '];'], ['const MOIS_FR = [', '];'],
                     ['const SEM_LETTRES = [', '];'],
                     /* La sonde d'ouverture : un panneau de mesure pour moi,
                        jamais montré à un joueur. Rien à y traduire. */
                     ['const SONDE = (function(){', 'document.body.appendChild(box);'],
                     /* ACCUEIL_DEF n'est pas de l'interface : c'est le repli
                        du verset d'accueil, qui passe par texteVerset(). */
                     ['const ACCUEIL_REF', 'function texteAccueil']])
  net = effacer(net, a, b);

const OUTILS = /\b(le|la|les|des|une|est|sont|pour|avec|sans|dans|votre|vos|pas|plus|que|qui|cette|ces|aux|mon|ma|mes|nous|tout|toute|du|au|ou|et|un|de|se|sur|par|je|tu|ton|ta|tes|il|elle|on)\b/gi;
/* ===== DEUX MOTS-OUTILS, C'ÉTAIT UN SEUIL TROP HAUT =====
   La règle demandait un accent OU deux mots de cette liste. Une étiquette
   courte n'a ni l'un ni l'autre : « Yada t'offre un gel », « il te reste 1
   gel », « · parti », « Joueur 1 » sont passés des mois durant, et se sont
   affichés en français sur un téléphone anglophone.
   ON AJOUTE DONC UN SECOND FILET, À UN SEUL MOT — mais un mot qui n'existe
   QU'EN FRANÇAIS. Chaque entrée de cette liste a été vérifiée contre
   l'anglais : « on », « plus », « car », « son », « point », « question »,
   « chance », « note », « client » en sont exclus exprès, ce sont aussi des
   mots anglais. Ce qui reste ne peut pas apparaître dans une phrase anglaise
   par accident. */
const FRANCAIS_SEUL = new RegExp('\\b(' + [
  'le','la','les','des','une','du','au','aux','ce','cet','cette','ces',
  'mon','ma','mes','ton','ta','tes','son','sa','ses','nos','vos','leur','leurs',
  'je','tu','il','elle','nous','vous','ils','elles','me','te','se','ne','lui','y',
  'est','sont','était','sera','fait','faire','aller','avoir','être',
  'avec','sans','pour','dans','sous','vers','chez','entre','depuis','jusqu',
  'encore','déjà','aussi','alors','donc','mais','quand','comme','très','trop',
  'bien','mieux','moins','tout','toute','tous','toutes','aucun','aucune',
  'chaque','autre','autres','même','mêmes','ici','demain','hier','jamais','toujours',
  'joueur','joueurs','partie','parties','jour','jours','erreur','erreurs',
  'gel','gels','série','reste','quitter','rester','offre','couvre','manqué',
  'réserve','terminé','terminée','parti','partie','perdue','perdu','réessaie',
  'livre','livres','verset','versets','réponse','réponses','carnet','flamme',
  'salon','adversaire','hôte','équipe','équipes','langue','réglages','accueil',
].join('|') + ')\\b', 'i');
const ACCENT = /[àâäéèêëîïôöùûüçÀÉÈÊÏÔÛÇæœ]/;
/* RETIRER LES ${…} EN COMPTANT LES ACCOLADES.
   /\$\{[^}]*\}/ s'arrête à la PREMIÈRE accolade fermante — donc au milieu de
   ${Tf("…", {n:x})}, et tout ce qui suit était pris pour du texte affiché. Le
   banc dénonçait alors des morceaux de code comme des phrases oubliées. */
function sansTrous(t){
  let out = '', i = 0;
  while(i < t.length){
    if(t[i] === '$' && t[i+1] === '{'){
      let prof = 1; i += 2;
      while(i < t.length && prof > 0){
        if(t[i] === '{') prof++;
        else if(t[i] === '}') prof--;
        i++;
      }
      out += '\u0001';
      continue;
    }
    out += t[i++];
  }
  return out;
}
/* ===== CE QUI N'EST PAS DU TEXTE, ET QUI EN A L'AIR =====
   Le filet à un seul mot français ramène aussi des noms de classes, des
   sélecteurs et des clés internes : « accueil », « tout », « livre », « me »
   sont à la fois des mots français et des morceaux de code. Chacun est ici
   nommé EXACTEMENT, avec sa raison — pas de motif large qui rendrait le banc
   aveugle à la première vraie phrase qui lui ressemblerait. */
const PAS_DU_TEXTE = new Map([
  ['Joueur 1',              'le nom ENREGISTRÉ d\'une équipe sans nom ; nomEquipe() le traduit à l\'affichage'],
  ['Joueur 2',              'idem'],
  ['--verset-max',          'le nom d\'une propriété CSS'],
  ['plafond du verset :',   'un console.warn pour moi, jamais montré'],
  ["startRevision('tout')", 'un morceau d\'attribut onclick'],
  ['livre:',                'le préfixe d\'une clé passée à startRevision'],
  ['Autres',                'une clé de comparaison ; livresDuCarnet ne fait jamais cette tuile'],
  ['screen accueil',        'deux classes CSS'],
  ['ds-side me',            'deux classes CSS'],
  ['fj fait',               'deux classes CSS'],
  ['[data-count-me]',       'un sélecteur CSS'],
  ['<button class="sem-flamme', 'un début de balise'],
  [' data-langue=',         'le nom d\'un attribut, coupé par une interpolation'],
  ['" data-langue="',       'idem, guillemets compris : la balise ouvrante n\'est pas fermée sur la ligne'],
]);

const trainent = new Map();
/* {3,} et non * : une chaîne VIDE, comme le premier argument de ligne(""…),
   désynchronisait le balayage — le moteur ouvrait sur la première apostrophe
   de "" et refermait sur celle du littéral suivant, si bien qu'il rapportait
   des bouts de code à cheval sur deux chaînes. On accepte donc le vide ici,
   et c'est la longueur du TEXTE qui filtre plus bas. */
const RE = /(["'`])((?:[^\\\n]|\\.)*?)\1/g;
/* Le blanchiment garde la longueur : un décalage dans « net » est le même
   décalage dans « src ». On peut donc demander à zonesT si ce littéral-ci est
   déjà à l'intérieur d'un appel à T(). */
/* ===== UN GABARIT MULTILIGNE EST UN LITTÉRAL, MÊME S'IL TIENT SUR DIX =====
   Ce banc lisait LIGNE PAR LIGNE, et son motif exclut explicitement le saut
   de ligne ([^\\n]). Or presque tout le balisage du jeu est écrit en gabarits
   `…` qui s'étalent sur plusieurs lignes : aucun ne pouvait correspondre.
   Le banc annonçait donc « aucune phrase française ne traîne hors de T() »
   alors que des écrans ENTIERS n'étaient pas traduits — l'accueil En ligne au
   complet, vu en anglais sur le téléphone de Taylor, en français.
   On replie donc chaque gabarit sur une seule ligne AVANT de scanner : les
   sauts de ligne qui sont À L'INTÉRIEUR d'un `…` deviennent des espaces. La
   longueur ne bouge pas d'un caractère, donc les décalages calculés plus haut
   (zonesT) restent exacts. */
function replierGabarits(t){
  /* Une PILE, et non un drapeau : le balisage du jeu est fait de gabarits
     DANS des ${…} DANS des gabarits. Ma première version ne repliait que le
     premier niveau, et « Partie aléatoire » — deux niveaux plus bas — lui
     échappait encore. On empile donc : « tpl » quand on entre dans un `…`,
     « expr » quand on entre dans un ${…}, « bloc » pour les accolades
     ordinaires qu'il contient. Un retour à la ligne ne se replie que s'il est
     DIRECTEMENT dans un gabarit : c'est là, et seulement là, qu'il y a du
     texte lu par le joueur. */
  const out = t.split('');
  const pile = [];
  let i = 0;
  while(i < out.length){
    const c = out[i];
    const haut = pile.length ? pile[pile.length - 1] : null;
    if(c === '\\'){ i += 2; continue; }
    if(haut !== 'tpl' && (c === '"' || c === "'")){
      const q = c; i++;
      while(i < out.length && out[i] !== q){ if(out[i] === '\\') i++; i++; }
      i++; continue;
    }
    if(c === '`'){ if(haut === 'tpl') pile.pop(); else pile.push('tpl'); i++; continue; }
    if(haut === 'tpl'){
      if(c === '$' && out[i + 1] === '{'){ pile.push('expr'); i += 2; continue; }
      if(c === '\n') out[i] = ' ';
      i++; continue;
    }
    if(haut === 'expr' || haut === 'bloc'){
      if(c === '{'){ pile.push('bloc'); i++; continue; }
      if(c === '}'){ pile.pop(); i++; continue; }
    }
    i++;
  }
  return out.join('');
}
/* Le repliage DÉPLACE les numéros de ligne : la troisième porte, qui les
   affiche, travaille donc sur le texte d'origine. Elle n'a pas besoin du
   repliage — un texte entre deux balises tient sur sa ligne. */
const netBrut = net;
net = replierGabarits(net);
let debutLigne = 0;
net.split('\n').forEach((ligne, n) => {
  const base = debutLigne;
  debutLigne += ligne.length + 1;
  let m; RE.lastIndex = 0;
  while((m = RE.exec(ligne))){
    /* L'APOSTROPHE FRANÇAISE N'OUVRE PAS UNE CHAÎNE. « d'affilée » suivi
       plus loin de « l'hôte » ressemble à s'y méprendre à un littéral entre
       apostrophes : le banc annonçait alors une phrase coupée en son milieu.
       Une vraie ouverture n'est jamais collée à une lettre. */
    if(m[1] === "'" && /[\p{L}\d]/u.test(ligne[m.index - 1] || '')) continue;
    if(dansT(base + m.index) || dansT(base + m.index + m[0].length - 1)) continue;
    const brut = m[2];
    /* UN GABARIT N'EST PAS UNE PHRASE. `<b>${T("Rappels")}</b>` contient du
       français à l'intérieur d'un ${…} DÉJÀ traduit : on ne juge donc que ce
       qui reste une fois les interpolations et les balises retirées — c'est
       exactement le texte que le joueur lira. Un attribut parlant
       (aria-label, placeholder, title) est du texte lu à voix haute par un
       lecteur d'écran : il compte, et il est extrait à part. */
    const bouts = [];
    if(/[`'"]/.test(m[1]) && /\$\{|<[a-z!/]/i.test(brut)){
      for(const a of brut.matchAll(/(?:aria-label|placeholder|title|alt)=\\?["']([^"'\\]{3,})/gi)) bouts.push(a[1]);
      bouts.push(...sansTrous(brut).replace(/<[^>]*>/g, '\u0001').split('\u0001'));
    } else bouts.push(brut);
    for(const b of bouts){
      const txt = b.trim();
      if(txt.length < 3) continue;
      if(/^[\s\d.,:%\/·—–-]*$/.test(txt)) continue;
      if(/^[a-z-]+$/.test(txt)) continue;                       // une classe, une clé
      if(/^(https?:|data:|#|\.|\/|[A-Za-z_$]+\()/.test(txt)) continue;
      /* Un littéral COMPARÉ n'est pas un littéral AFFICHÉ : `x === "Ésaïe"`
         teste un nom de livre, il ne l'écrit pas à l'écran. */
      if(/[=!]==?\s*$/.test(ligne.slice(0, m.index))) continue;
      if(!(ACCENT.test(txt) || (txt.match(OUTILS) || []).length >= 2 || FRANCAIS_SEUL.test(txt))) continue;
      /* DÉJÀ AU DICTIONNAIRE = DÉJÀ TRADUISIBLE. Certaines phrases vivent dans
         une table de données — les seize objectifs, les dix-huit mots de la
         fin, les libellés de durée — et ne passent par T() qu'au moment du
         rendu : T(a.t), T(choix[i]), T(TIMER_LABELS[k]). Écrites là, elles
         n'ont pas de T() collé devant, et pourtant elles seront bien
         traduites. Ce qui compte n'est donc pas la FORME de l'appel, mais la
         présence de la clé. Cette règle a l'avantage d'être la bonne dans les
         deux sens : pour taire ce banc, il faut poser la traduction. */
      if(PAS_DU_TEXTE.has(txt)) continue;
      if(clesPlates.has(plat(txt))) continue;
      if(!trainent.has(txt)) trainent.set(txt, n + 1);
    }
  }
});
if(trainent.size){
  ko++;
  console.log('  KO ' + trainent.size + ' phrase(s) française(s) hors de T() :');
  [...trainent].sort((a, b) => a[1] - b[1]).slice(0, 12)
    .forEach(([t, n]) => console.log('       ligne ' + n + '  ' + t.slice(0, 100)));
} else console.log('  OK aucune phrase française ne traîne hors de T()');

/* ============ TROISIÈME PORTE : LE TEXTE HTML LUI-MÊME ============
   Les deux premières cherchent des LITTÉRAUX. C'est le bon angle pour une
   chaîne isolée, et le mauvais pour du balisage : le jeu est écrit en
   gabarits `…` imbriqués les uns dans les autres, et aucun motif d'expression
   régulière ne sait où l'un finit et où l'autre commence. Résultat, l'accueil
   En ligne au complet — « Partie aléatoire », « Créer une partie »,
   « Rejoindre une partie » — passait au travers, et Taylor l'a vu en français
   sur un téléphone réglé en anglais.
   On prend donc le problème par l'autre bout. Ce que le joueur lit dans une
   page, c'est ce qui se trouve ENTRE deux balises. On efface les ${…} — tout
   ce qui est calculé, donc tout ce qui passe par T() — et l'on regarde ce qui
   reste entre « > » et « < ». Ce qui reste est, par construction, du texte
   écrit en dur. S'il a l'air français, il ne sera jamais traduit. */
const sansExpr = (function(){
  /* On efface le CODE, on garde le TEXTE. Première version : j'effaçais tout
     ce qui se trouve dans un ${…}. C'était trop — le balisage du jeu vit
     précisément là, dans des branches conditionnelles
     (« ${x ? `<b>Oui</b>` : `<b>Non</b>`} »), et j'ai effacé les écrans mêmes
     que je cherchais. On suit donc la même pile qu'au-dessus : dans un
     gabarit on garde, dans du code on blanchit, et un gabarit ouvert À
     L'INTÉRIEUR du code se garde à nouveau. */
  const o = netBrut.split('');
  const pile = [];
  let i = 0;
  while(i < o.length){
    const c = o[i];
    const haut = pile.length ? pile[pile.length - 1] : null;
    const code = haut === 'expr' || haut === 'bloc' || haut === null;
    if(c === '\\'){ if(code && c !== '\n') o[i] = ' '; i += 2; continue; }
    if(c === '`'){
      if(haut === 'tpl') pile.pop(); else pile.push('tpl');
      o[i] = ' '; i++; continue;
    }
    if(haut === 'tpl'){
      if(c === '$' && o[i+1] === '{'){ pile.push('expr'); o[i] = ' '; o[i+1] = ' '; i += 2; continue; }
      i++; continue;                                  // du texte : on le garde
    }
    if(haut === 'expr' || haut === 'bloc'){
      if(c === '{'){ pile.push('bloc'); o[i] = ' '; i++; continue; }
      if(c === '}'){ pile.pop(); o[i] = ' '; i++; continue; }
    }
    if(c !== '\n') o[i] = ' ';                         // du code : on l'efface
    i++;
  }
  return o.join('');
})();
const enDur = new Map();
let ligneN = 1, pos = 0;
for(const ligne of sansExpr.split('\n')){
  for(const m of ligne.matchAll(/>([^<>]{3,}?)</g)){
    const txt = m[1].replace(/\s+/g, ' ').trim();
    if(txt.length < 3) continue;
    if(/^[\s\d.,:;%\/·—–()\[\]{}+*=-]*$/.test(txt)) continue;
    if(/^[a-z][a-z0-9-]*$/.test(txt)) continue;
    /* ===== ICI, PAS DE DEVINETTE SUR LA LANGUE =====
       Les deux premières portes doivent deviner si un littéral est français,
       parce qu'un littéral peut être une clé, une classe, une couleur. Celle-ci
       n'a pas ce problème : ce qui est ENTRE DEUX BALISES et n'est pas
       calculé, c'est du texte affiché, écrit en dur — quelle que soit sa
       langue, il ne passera jamais par T(). La deviner coûtait cher :
       « Rejoindre une partie » n'a pas d'accent et ne contient qu'un mot
       outil, il passait au travers pendant que ses deux voisins étaient pris.
       On les prend donc tous, et on écarte seulement ce qui n'est pas une
       phrase : chiffres, symboles, un mot technique en minuscules. */
    if(!/[A-Za-zÀ-ÿ]{2}/.test(txt)) continue;
    /* Trois exceptions, nommées une par une — une liste d'exceptions qu'on
       peut lire vaut mieux qu'un seuil qui en cache. Ce ne sont pas des
       phrases : une unité, un séparateur de score, et le nom du bloc de code
       que le message de configuration demande d'ouvrir. */
    if(txt === '&nbsp;%' || txt === '· pts' || txt === 'CONFIG EN LIGNE') continue;
    if(!enDur.has(txt)) enDur.set(txt, ligneN);
  }
  ligneN++; pos += ligne.length + 1;
}
if(enDur.size){
  ko++;
  console.log('  KO ' + enDur.size + ' texte(s) écrit(s) en dur dans le balisage :');
  [...enDur].sort((a, b) => a[1] - b[1]).slice(0, 60)
    .forEach(([t, n]) => console.log('       ligne ' + n + '  ' + t.slice(0, 92)));
  if(enDur.size > 60) console.log('       … et ' + (enDur.size - 60) + ' autre(s)');
} else console.log('  OK aucun texte français écrit en dur dans le balisage');

/* ============ QUATRIÈME PORTE : LE TEXTE PASSÉ EN ARGUMENT ============
   La troisième regarde ce qui est ENTRE deux balises. Restent les phrases que
   le code donne à une fonction : renderHeader("En ligne"), un ternaire
   n>1?"connectés":"connecté", le titre d'une fenêtre. Elles ne sont jamais
   entre deux balises, et la première porte ne les voit pas non plus — son
   motif ne sait pas traverser des gabarits imbriqués les uns dans les autres.
   On prend donc l'INVERSE du masque précédent : on garde le code, on efface
   le texte, et on y cherche les littéraux. Ce qui a un accent ou deux mots
   outils est du français ; ce qui est déjà dans un T() ne compte pas. */
const codeSeul = (function(){
  const o = netBrut.split('');
  const pile = [];
  let i = 0;
  while(i < o.length){
    const c = o[i];
    const haut = pile.length ? pile[pile.length - 1] : null;
    if(c === '\\'){ i += 2; continue; }
    if(c === '`'){
      if(haut === 'tpl') pile.pop(); else pile.push('tpl');
      o[i] = ' '; i++; continue;
    }
    if(haut === 'tpl'){
      if(c === '$' && o[i+1] === '{'){ pile.push('expr'); o[i] = ' '; o[i+1] = ' '; i += 2; continue; }
      if(c !== '\n') o[i] = ' ';                 // du texte : effacé ici
      i++; continue;
    }
    if(haut === 'expr' || haut === 'bloc'){
      if(c === '{'){ pile.push('bloc'); i++; continue; }
      if(c === '}'){ pile.pop(); i++; continue; }
    }
    i++;                                         // du code : gardé
  }
  return o.join('');
})();
const enArg = new Map();
const RE2 = /(["'])((?:[^\\\n]|\\.)*?)\1/g;
let lg = 1, dl = 0;
for(const ligne of codeSeul.split('\n')){
  let m; RE2.lastIndex = 0;
  while((m = RE2.exec(ligne))){
    const txt = m[2].trim();
    const abs = dl + m.index;
    if(txt.length < 4) continue;
    if(zonesT.some(([a, b]) => abs >= a && abs <= b)) continue;   // déjà dans un T()
    if(/^[a-z][a-z0-9_-]*$/.test(txt)) continue;                  // une clé, une classe
    if(/^(https?:|data:|#|\.|\/)/.test(txt)) continue;
    if(/[=!]==?\s*$/.test(ligne.slice(0, m.index))) continue;      // une COMPARAISON
    if(!(ACCENT.test(txt) || (txt.match(OUTILS) || []).length >= 2 || FRANCAIS_SEUL.test(txt))) continue;
    /* ===== UNE PHRASE AU DICTIONNAIRE N'EST PAS UN OUBLI =====
       Ces phrases vivent dans des TABLES (les succès, les portes d'« À
       revoir », les mots de fin) et passent par T() au moment de s'afficher :
       T(a.t), T(choix[i]). Le littéral, lui, n'est pas dans un T() — la porte
       les signalait donc toutes, y compris les cinquante-trois qui étaient
       parfaitement traduites. Ce qu'on cherche ici, c'est une phrase de table
       SANS traduction : celles-là retombent en français, en silence. */
    if(PAS_DU_TEXTE.has(txt)) continue;
    if(clesPlates.has(plat(txt))) continue;
    if(!enArg.has(txt)) enArg.set(txt, lg);
  }
  lg++; dl += ligne.length + 1;
}
if(enArg.size){
  ko++;
  console.log('  KO ' + enArg.size + ' phrase(s) française(s) passée(s) en argument :');
  [...enArg].sort((a, b) => a[1] - b[1]).slice(0, 80)
    .forEach(([t, n]) => console.log('       ligne ' + n + '  ' + t.slice(0, 92)));
  if(enArg.size > 80) console.log('       … et ' + (enArg.size - 80) + ' autre(s)');
} else console.log('  OK aucune phrase française passée en argument');

/* ============ CINQUIÈME PORTE : CE QU'ON CONFIE À showModal ============
   LE TROU QUE LES QUATRE AUTRES ONT LAISSÉ PASSER PENDANT DES MOIS.
   showModal ne traduit rien : l'appelant doit poser ses T() lui-même. Treize
   phrases ne l'avaient jamais été — « Quitter la partie ? », « La partie en
   cours sera perdue. », « Rester », « Non merci », « Code incorrect. » — et
   aucune n'était seulement AU dictionnaire. Pourtant les portes précédentes
   étaient vertes : elles jugent le français sur deux indices, un accent ou
   deux mots-outils, et une étiquette courte n'a ni l'un ni l'autre.
   « Quitter » n'a pas d'accent et pas un seul « le » ; « Quitter la partie ? »
   n'en a qu'un. Le joueur anglophone qui quittait une partie lisait donc une
   confirmation entièrement française, à l'endroit le plus risqué du jeu.
   CETTE PORTE-CI NE DEVINE RIEN. Elle ne demande pas « est-ce que ça a l'air
   français ? », elle demande « est-ce que c'est passé par T() ? » — la seule
   question dont la réponse soit toujours sûre. Un littéral nu dans un champ
   que le joueur LIT est refusé, quelle que soit la langue dans laquelle il
   est écrit. */
{
  const CHAMPS = /(?:^|[{,\s])(title|message|okLabel|cancelLabel|placeholder|errorText)\s*:\s*(["'])/g;
  /* « OK » est le même mot dans les deux langues, et c'est le repli du bouton
     quand l'appelant ne dit rien. */
  const LIBRES = new Set(['OK']);
  const nus = [];
  for(const m of src.matchAll(/\bshowModal\s*\(/g)){
    let i = m.index + m[0].length, prof = 1;
    while(i < src.length && prof > 0){
      const c = src[i];
      if(c === '(') prof++;
      else if(c === ')') prof--;
      else if(c === '"' || c === "'" || c === '`'){ i = litteral(src, i)[1]; continue; }
      i++;
    }
    const bloc = src.slice(m.index, i);
    let mm; CHAMPS.lastIndex = 0;
    while((mm = CHAMPS.exec(bloc))){
      const [v] = litteral(bloc, mm.index + mm[0].length - 1);
      if(v === null || LIBRES.has(v) || !v.trim()) continue;
      nus.push([src.slice(0, m.index).split('\n').length, mm[1], v]);
    }
  }
  if(nus.length){
    ko++;
    console.log('  KO ' + nus.length + ' texte(s) confié(s) à showModal sans passer par T() :');
    nus.slice(0, 20).forEach(([n, ch, v]) => console.log('       ligne ' + n + '  ' + ch + ' : ' + v.slice(0, 80)));
  } else console.log('  OK tout ce que showModal affiche passe par T()');
}

console.log(ko === 0 ? '\n  OK' : '\n  ' + ko + ' défaut(s)');
process.exit(ko === 0 ? 0 : 1);
