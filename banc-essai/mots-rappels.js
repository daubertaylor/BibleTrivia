/* ============ BANC « LES MOTS DES RAPPELS » ============
   Dix-huit formulations réparties sur cinq motifs, avec des trous à remplir
   ({n}, {j}, {s}). Personne ne les verra avant qu'elles n'arrivent sur le
   téléphone de quelqu'un, un soir, une fois — et une faute d'accord ou un
   trou oublié y restera des mois.
   On les rend donc TOUTES, pour toutes les valeurs qui comptent, et on
   vérifie qu'il ne reste aucun trou, que le pluriel s'accorde, et que le
   tirage du jour est stable (deux envois le même jour disent la même chose)
   sans être figé (deux jours de suite disent autre chose).
   Le service worker n'est pas chargé : on en extrait les trois morceaux
   purs — ils n'ont besoin ni de navigateur ni de réseau.
   Usage : node banc-essai/rappels.js
*/
const fs = require('fs');
const src = fs.readFileSync(__dirname + '/../sw.js', 'utf8');

/* Du début de « depart » jusqu'à la fin de « fin », bornes comprises. */
function morceau(depart, fin){
  const i = src.indexOf(depart);
  if(i < 0) throw new Error('introuvable dans sw.js : ' + depart);
  const j = src.indexOf(fin, i + depart.length);
  if(j < 0) throw new Error('fin introuvable après : ' + depart);
  return src.slice(i, j + fin.length);
}
/* (v326) Les mots existent en trois langues : du français jusqu'à la table
   des langues, tout est pris. */
const code = morceau('const MOTS = {', 'const MOTS_LANGUE = { fr: MOTS, en: MOTS_EN, es: MOTS_ES };\n')
           + morceau('function motsDuJour', '\n}\n')
           + morceau('function remplir', '\n}\n')
           + '\nreturn { MOTS, MOTS_LANGUE, motsDuJour, remplir };';
const { MOTS, MOTS_LANGUE, motsDuJour, remplir } = new Function(code)();
const LANGUES = Object.keys(MOTS_LANGUE);

let ko = 0;
const dire = (bon, txt) => { if(!bon){ ko++; console.log('  KO  ' + txt); } };

/* 0. (v326) LES TROIS LANGUES DISENT LES MÊMES CHOSES : mêmes motifs, et
      autant de formulations par motif — un motif qui n'aurait que deux
      formulations en espagnol tournerait moins qu'en français. */
for(const lg of LANGUES){
  const L = MOTS_LANGUE[lg];
  dire(JSON.stringify(Object.keys(L).sort()) === JSON.stringify(Object.keys(MOTS).sort()), lg + ' : motifs ' + Object.keys(L).sort() + ' au lieu de ' + Object.keys(MOTS).sort());
  for(const g of Object.keys(MOTS)) dire(L[g] && L[g].length === MOTS[g].length, lg + ' : « ' + g + ' » a ' + (L[g] || []).length + ' formulation(s), le français ' + MOTS[g].length);
}
/* Et le rappel du jeu ne parle plus d'un « défi du jour » : il n'existe plus
   dans le jeu (la flamme compte n'importe quelle partie). */
for(const lg of LANGUES) for(const [g, l] of Object.entries(MOTS_LANGUE[lg])) for(const [t, c] of l)
  dire(!/d[ée]fi|challenge|desaf[ií]o/i.test(t + ' ' + c), lg + ' : « ' + g + ' » parle encore du défi du jour -> ' + t + ' | ' + c);

/* 1. AUCUN TROU NE RESTE. */
let rendus = 0;
for(const lg of LANGUES) for(const genre of Object.keys(MOTS_LANGUE[lg])){
  for(const [titre, corps] of MOTS_LANGUE[lg][genre]){
    for(const val of [{n:0,j:0},{n:1,j:1},{n:2,j:3},{n:12,j:30}]){
      const t = remplir(titre, val), c = remplir(corps, val);
      rendus += 2;
      dire(!/[{}]/.test(t + c), genre + ' : il reste un trou -> ' + t + ' | ' + c);
      dire(t.length > 3 && c.length > 3, genre + ' : texte trop court -> ' + t + ' | ' + c);
      dire(!/undefined|NaN/.test(t + c), genre + ' : valeur manquante -> ' + t + ' | ' + c);
    }
  }
}
console.log('  ' + rendus + ' textes rendus, tous motifs et toutes valeurs');

/* 2. LE PLURIEL S'ACCORDE, dans les trois langues. */
for(const [lg, mot] of [['fr', 'question'], ['en', 'question'], ['es', 'pregunta']]) for(const [titre] of MOTS_LANGUE[lg].revoir){
  if(!/\{s\}/.test(titre)) continue;
  dire(new RegExp(mot + '(?!s)').test(remplir(titre, {n:1,j:0})), lg + ' : pluriel « 1 ' + mot + 's » -> ' + remplir(titre, {n:1,j:0}));
  dire(new RegExp(mot + 's').test(remplir(titre, {n:4,j:0})), lg + ' : pluriel « 4 ' + mot + ' » -> ' + remplir(titre, {n:4,j:0}));
}

/* 3. LE TIRAGE EST STABLE DANS LA JOURNÉE, ET CHANGE D'UN JOUR À L'AUTRE. */
for(const genre of Object.keys(MOTS)){
  const a = motsDuJour(genre, '2026-09-13'), b = motsDuJour(genre, '2026-09-13');
  dire(a === b, genre + ' : deux tirages du même jour diffèrent');
}
/* (v326) Le tirage parle la langue demandée, et une langue inconnue (ou un
   miroir d'avant la v326, sans langue) retombe sur le français. */
for(const lg of LANGUES) for(const genre of Object.keys(MOTS)){
  const m = motsDuJour(genre, '2026-09-13', lg);
  dire(MOTS_LANGUE[lg][genre].indexOf(m) >= 0, lg + ' : le tirage de « ' + genre + ' » ne vient pas de sa langue');
}
dire(MOTS.priere.indexOf(motsDuJour('priere', '2026-09-13', undefined)) >= 0, 'sans langue : pas de repli sur le français');
dire(MOTS.priere.indexOf(motsDuJour('priere', '2026-09-13', 'de')) >= 0, 'langue inconnue : pas de repli sur le français');
/* Sur trente jours, on doit voir plusieurs formulations de chaque motif — un
   tirage qui retombe toujours sur la même n'est pas un tirage. */
for(const genre of Object.keys(MOTS)){
  const vus = new Set();
  for(let d = 1; d <= 30; d++) vus.add(motsDuJour(genre, '2026-09-' + String(d).padStart(2,'0'))[0]);
  const attendu = new Set(MOTS[genre].map(m=>m[0])).size;
  dire(vus.size === attendu, genre + ' : ' + vus.size + ' formulation(s) vue(s) sur 30 jours, ' + attendu + ' attendue(s)');
}
console.log('  tirage : stable dans la journée, et il fait le tour des formulations en un mois');

/* 4. LES MOTIFS DU SERVEUR ET CEUX DE L'APPAREIL SONT LES MÊMES. Deux listes
      dans deux fichiers finissent toujours par diverger ; on les compare. */
const serveur = [...new Set([...fs.readFileSync(__dirname + '/../notifications/rappels.ts', 'utf8')
  .matchAll(/genre:\s*"([a-z]+)"/g)].map(m=>m[1]))].sort();
const swConnus = (src.match(/const CONNUS = \[([^\]]+)\]/) || [,''])[1]
  .split(',').map(x=>x.trim().replace(/"/g,'')).filter(Boolean).sort();
dire(JSON.stringify(serveur) === JSON.stringify(swConnus),
  'motifs : le serveur envoie ' + JSON.stringify(serveur) + ', l\'appareil connaît ' + JSON.stringify(swConnus));
/* Et chaque motif du serveur a bien des mots, dans chaque langue. (v329) Les
   messages des groupes ont les leurs (MOTS_MESSAGE) : pas des formulations
   qui tournent, une ligne de messagerie — banc-essai/sw-messages.js les rend. */
const MOTS_MESSAGE = new Function(morceau('const MOTS_MESSAGE = {', '\n};\n') + '\nreturn MOTS_MESSAGE;')();
for(const g of serveur) for(const lg of LANGUES)
  dire(g === 'message'
         ? !!MOTS_MESSAGE[lg] && ['ligne', 'partie', 'mention', 'titre', 'quelquun'].every(k => typeof MOTS_MESSAGE[lg][k] === 'string' && MOTS_MESSAGE[lg][k].length > 3)
         : !!MOTS_LANGUE[lg][g],
       'motif « ' + g +' » envoyé par le serveur mais sans formulation en ' + lg + ' dans sw.js');
console.log('  motifs : ' + serveur.join(', ') + ' — serveur et appareil d\'accord');

/* 5. LES VERSETS SONT CEUX DU JEU, AU MOT PRÈS. Deux copies d'un même texte
      dans deux fichiers finissent toujours par diverger — et ici la divergence
      serait une citation fausse envoyée sur le téléphone de quelqu'un. On
      compare donc chaque verset des rappels à la liste du jeu (HERO_VERSES),
      et on vérifie au passage qu'aucun n'est tronqué. */
const jeu = new Map([...fs.readFileSync(__dirname + '/../index.html', 'utf8')
  .matchAll(/\{ t:"((?:[^"\\]|\\.)*)", r:"([^"]+)" \}/g)]
  .map(m => [m[2], m[1].replace(/\\"/g, '"')]));
for(const [, corps] of MOTS.verset){
  const m = corps.match(/^«\s(.+)\s»\s(.+)$/);
  dire(!!m, 'verset mal formé : ' + corps);
  if(!m) continue;
  const [, texte, ref] = m;
  const attendu = jeu.get(ref);
  dire(!!attendu, 'verset « ' + ref + ' » : introuvable dans la liste du jeu');
  if(!attendu) continue;
  /* Les espaces insécables du bandeau ne comptent pas comme une différence. */
  const nu = (x) => x.replace(/\u00a0/g, ' ').trim();
  dire(nu(texte) === nu(attendu),
    ref + ' : le rappel dit « ' + texte + ' », le jeu dit « ' + attendu + ' »');
}
console.log('  versets : ' + MOTS.verset.length + ', tous conformes au texte du jeu et tous complets');
/* (v326) En anglais et en espagnol aussi, AU MOT PRÈS : chaque citation doit
   se trouver telle quelle dans le jeu (King James 1769, Reina-Valera 1909).
   Un texte qu'on ne retrouve pas mot pour mot dans le jeu serait une
   citation de mémoire. */
const indexJeu = fs.readFileSync(__dirname + '/../index.html', 'utf8');
for(const [lg, ouvre, ferme] of [['en', '“', '”'], ['es', '«', '»']]){
  for(const [, corps] of MOTS_LANGUE[lg].verset){
    const i = corps.indexOf(ouvre), j = corps.indexOf(ferme, i + 1);
    dire(i === 0 && j > 0, lg + ' : verset mal formé : ' + corps);
    if(!(i === 0 && j > 0)) continue;
    const texte = corps.slice(1, j);
    dire(indexJeu.indexOf('"' + texte + '"') >= 0, lg + ' : « ' + texte + ' » ne se trouve pas tel quel dans le jeu');
  }
}
console.log('  versets anglais et espagnols : recopiés du jeu, mot pour mot');

console.log(ko === 0 ? '\n  OK — les rappels disent tous quelque chose de correct' : '\n  ' + ko + ' défaut(s)');
process.exit(ko === 0 ? 0 : 1);
