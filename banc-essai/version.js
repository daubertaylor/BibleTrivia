/* ====== BANC « LA VERSION DU JEU DIT LA VÉRITÉ » ======
   index.html porte VERSION_JEU, sw.js porte CACHE. Les deux sont publiés
   ensemble et doivent dire la même chose : une erreur remontée d'un téléphone
   ne vaut rien si le numéro qu'elle porte n'est pas celui qui tournait.
   Deux lignes à bouger à chaque publication, donc une occasion d'en oublier
   une — ce banc est là pour ça. Il ne lance aucun navigateur : il lit.

   Usage : node banc-essai/version.js
*/
const fs = require('fs');
const path = require('path');
const racine = path.join(__dirname, '..');
const idx = fs.readFileSync(path.join(racine, 'index.html'), 'utf8');
const sw  = fs.readFileSync(path.join(racine, 'sw.js'), 'utf8');

const a = (/const VERSION_JEU = "([^"]+)"/.exec(idx) || [])[1];
const b = (/const CACHE = "yada-([^"]+)"/.exec(sw) || [])[1];

console.log('  index.html  VERSION_JEU = ' + (a || 'ABSENTE'));
console.log('  sw.js       CACHE       = yada-' + (b || 'ABSENT'));

const fautes = [];
if(!a) fautes.push('index.html ne porte pas VERSION_JEU');
if(!b) fautes.push('sw.js ne porte pas un CACHE de la forme « yada-vNNN »');
if(a && b && a !== b) fautes.push('les deux ne disent pas la même chose : « ' + a + ' » et « ' + b + ' »');

if(fautes.length){ console.log('\n  DÉFAUTS :'); fautes.forEach(f => console.log('   ' + f)); process.exit(1); }
console.log('\n  OK — le jeu et son cache portent le même numéro\n');
