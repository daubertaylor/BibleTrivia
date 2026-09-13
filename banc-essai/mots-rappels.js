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
const code = morceau('const MOTS = {', '\n};\n')
           + morceau('function motsDuJour', '\n}\n')
           + morceau('function remplir', '\n}\n')
           + '\nreturn { MOTS, motsDuJour, remplir };';
const { MOTS, motsDuJour, remplir } = new Function(code)();

let ko = 0;
const dire = (bon, txt) => { if(!bon){ ko++; console.log('  KO  ' + txt); } };

/* 1. AUCUN TROU NE RESTE. */
let rendus = 0;
for(const genre of Object.keys(MOTS)){
  for(const [titre, corps] of MOTS[genre]){
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

/* 2. LE PLURIEL S'ACCORDE. */
for(const [titre] of MOTS.revoir){
  if(!/\{s\}/.test(titre)) continue;
  dire(/question(?!s)/.test(remplir(titre, {n:1,j:0})), 'pluriel : « 1 questions » -> ' + remplir(titre, {n:1,j:0}));
  dire(/questions/.test(remplir(titre, {n:4,j:0})), 'pluriel : « 4 question » -> ' + remplir(titre, {n:4,j:0}));
}

/* 3. LE TIRAGE EST STABLE DANS LA JOURNÉE, ET CHANGE D'UN JOUR À L'AUTRE. */
for(const genre of Object.keys(MOTS)){
  const a = motsDuJour(genre, '2026-09-13'), b = motsDuJour(genre, '2026-09-13');
  dire(a === b, genre + ' : deux tirages du même jour diffèrent');
}
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
/* Et chaque motif du serveur a bien des mots (sauf l'essai, qui a les siens). */
for(const g of serveur){ if(g === 'essai') continue;
  dire(!!MOTS[g], 'motif « ' + g +' » envoyé par le serveur mais sans formulation dans sw.js'); }
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

console.log(ko === 0 ? '\n  OK — les rappels disent tous quelque chose de correct' : '\n  ' + ko + ' défaut(s)');
process.exit(ko === 0 ? 0 : 1);
