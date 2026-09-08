/* LA PORTE LA MOINS CHÈRE DU BANC.
   index.html est un seul fichier : une accolade de travers, un « const »
   déclaré deux fois dans la même portée, et TOUT le jeu ne démarre plus —
   la page reste blanche, sans un mot dans la console d'un téléphone. Les
   autres essais le voient, mais de loin : ils échouent sur un délai d'attente
   de 20 s, ce qui ressemble à un serveur mort plutôt qu'à une faute de frappe.
   Celui-ci extrait chaque <script> en ligne et le fait simplement ANALYSER
   par node. Deux secondes, et l'erreur est nommée avec sa ligne.

       node syntaxe.js                 (le vrai index.html)
       node syntaxe.js <fichier.html>  (pour vérifier que la porte ferme)

   À lancer en premier, avant tous les autres. */
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const SRC = process.argv[2] || path.join(__dirname, '..', 'index.html');
const html = fs.readFileSync(SRC, 'utf8');

/* On repère chaque bloc <script> SANS attribut src (les autres ne sont pas ici). */
const re = /<script(?![^>]*\ssrc=)([^>]*)>([\s\S]*?)<\/script>/gi;
let m, n = 0, mauvais = 0;
while ((m = re.exec(html)) !== null) {
  n++;
  /* Numéro de la ligne où commence le bloc : sans ça, « ligne 412 » ne veut
     rien dire dans un fichier de 12 000 lignes. */
  const debut = html.slice(0, m.index).split('\n').length;
  /* Le type se lit dans la BALISE OUVRANTE seule (m[1]) : cherché dans tout
     le bloc, on tombait sur « masterFilter.type = "lowpass" » au milieu du
     code audio et on sautait le fichier entier en croyant l'avoir ignoré. */
  const type = (m[1].match(/type\s*=\s*["']([^"']+)["']/i) || [,''])[1];
  if (type && !/javascript|module/i.test(type)) { console.log('  bloc ' + n + ' (ligne ' + debut + ') : type « ' + type +' », ignoré'); continue; }
  try {
    new vm.Script(m[2], { filename: 'index.html:' + debut });
    console.log('  bloc ' + n + ' (ligne ' + debut + ') : ' + m[2].split('\n').length + ' lignes, analysé');
  } catch (e) {
    mauvais++;
    console.log('  bloc ' + n + ' (ligne ' + debut + ') : ' + e.message);
    const dans = (e.stack.match(/index\.html:\d+:(\d+)/) || [])[1];
    if (dans) console.log('      -> vers la ligne ' + (debut + parseInt(dans, 10) - 1) + ' du fichier');
  }
}
console.log(mauvais ? '\n  ECHEC : ' + mauvais + ' bloc(s) illisible(s)' : '\n  OK');
process.exit(mauvais ? 1 : 0);
