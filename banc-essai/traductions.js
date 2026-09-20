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
for(const m of dEn.matchAll(/\n\s*"((?:[^"\\]|\\.)*)"\s*:/g)) cles.add(JSON.parse('"' + m[1] + '"'));
const clesPlates = new Set([...cles].map(plat));

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
      if(!(ACCENT.test(txt) || (txt.match(OUTILS) || []).length >= 2)) continue;
      /* DÉJÀ AU DICTIONNAIRE = DÉJÀ TRADUISIBLE. Certaines phrases vivent dans
         une table de données — les seize objectifs, les dix-huit mots de la
         fin, les libellés de durée — et ne passent par T() qu'au moment du
         rendu : T(a.t), T(choix[i]), T(TIMER_LABELS[k]). Écrites là, elles
         n'ont pas de T() collé devant, et pourtant elles seront bien
         traduites. Ce qui compte n'est donc pas la FORME de l'appel, mais la
         présence de la clé. Cette règle a l'avantage d'être la bonne dans les
         deux sens : pour taire ce banc, il faut poser la traduction. */
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

console.log(ko === 0 ? '\n  OK' : '\n  ' + ko + ' défaut(s)');
process.exit(ko === 0 ? 0 : 1);
