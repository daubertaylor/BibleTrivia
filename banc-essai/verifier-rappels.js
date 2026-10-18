/* ============ BANC « LE VÉRIFICATEUR DE LA FONCTION RAPPELS » ============
   notifications/verifier.js passe juste après chaque déploiement par GitHub
   (.github/workflows/rappels.yml) et dit, vert ou rouge, si la fonction en
   ligne est la bonne. Il ne doit JAMAIS réveiller l'ancienne fonction : elle
   ne vérifie rien, et chaque appel qui lui parvient fait un passage de
   rappels. Or Supabase laisse désormais passer la clé publishable du jeu
   devant « Verify JWT » (mesuré le 18/10/2026 : 200, sans version).
   On joue donc chaque état possible sur un faux serveur qui COMPTE les appels
   avec et sans clé :
     — tant que la tâche (sans clé) est refusée, aucun appel avec la clé ;
     — l'ancienne fonction sans porte : un seul appel, et l'alerte ;
     — le déploiement qui met quelques secondes à prendre : vert quand même ;
     — les clés VAPID qui ne vont pas, une autre clé publique que celle du
       jeu, une version d'avant, une fonction absente, personne au bout.
   Et sur le workflow, ce qui ne doit jamais bouger : « Verify JWT » s'en va
   dans la MÊME commande que le nouveau code, le jeton ne vient que des
   secrets, l'outil Supabase est figé et vérifié à l'octet.
   Usage : node banc-essai/verifier-rappels.js
*/
const fs = require('fs');
const http = require('http');
const path = require('path');
const { execFile } = require('child_process');

const RACINE = path.join(__dirname, '..');
const jeu = fs.readFileSync(path.join(RACINE, 'index.html'), 'utf8');
const PUB = jeu.match(/const VAPID_PUBLIC = "([^"]+)"/)[1];
const VERSION = +fs.readFileSync(path.join(RACINE, 'notifications/rappels.ts'), 'utf8').match(/const VERSION = (\d+);/)[1];

let ko = 0;
const dire = (bon, txt) => { if(!bon){ ko++; console.log('  KO  ' + txt); } else console.log('  OK  ' + txt); };

/* Chaque chemin du faux serveur est un état de la fonction en ligne. */
const compte = {};
const bonne = { version: VERSION, vapid: 'ok', pub: PUB };
const vieille = { envoyes: 0, examines: 8 };
const porte = { code: 'UNAUTHORIZED_NO_AUTH_HEADER', message: 'Missing authorization header' };
const ETATS = {
  'en-place':        (cle) => [200, bonne],
  'porte-fermee':    (cle) => cle ? [200, vieille] : [401, porte],
  'ancienne-ouverte':(cle) => [200, vieille],
  'tardive':         (cle, n) => (!cle && n.sans < 3) ? [401, porte] : [200, bonne],
  'jeu-refuse':      (cle) => cle ? [401, { code: 401, message: 'Invalid JWT' }] : [200, bonne],
  'vapid':           (cle) => [200, { version: VERSION, vapid: ['VAPID_PRIVEE est absente ou vide'], pub: PUB }],
  'autre-cle':       (cle) => [200, { version: VERSION, vapid: 'ok', pub: 'B' + 'x'.repeat(86) }],
  'version-avant':   (cle) => [200, { version: VERSION - 1, vapid: 'ok', pub: PUB }],
  'absente':         (cle) => [404, { code: 'NOT_FOUND', message: 'Requested function was not found' }],
};
const serveur = http.createServer((q, r) => {
  let corps = '';
  q.on('data', d => corps += d);
  q.on('end', () => {
    const etat = q.url.slice(1), cle = !!q.headers.authorization || !!q.headers.apikey;
    const n = compte[etat] = compte[etat] || { sans: 0, avec: 0, corps: [] };
    cle ? n.avec++ : n.sans++;
    n.corps.push(corps);
    const [st, o] = (ETATS[etat] || (() => [500, {}]))(cle, n);
    r.writeHead(st, { 'Content-Type': 'application/json' });
    r.end(JSON.stringify(o));
  });
});

function verifier(url){
  return new Promise(ok => {
    const env = Object.assign({}, process.env, { RAPPELS_URL: url, VERIFIER_ESSAIS: '4', VERIFIER_PAUSE_MS: '20' });
    delete env.GITHUB_STEP_SUMMARY; delete env.GITHUB_ACTIONS;
    execFile(process.execPath, [path.join(RACINE, 'notifications/verifier.js')], { env, timeout: 30000 },
      (e, sortie) => ok({ code: e ? (e.code | 0) : 0, sortie: String(sortie) }));
  });
}

(async () => {
  await new Promise(ok => serveur.listen(0, '127.0.0.1', ok));
  const base = 'http://127.0.0.1:' + serveur.address().port + '/';
  const r = {};
  for(const etat of Object.keys(ETATS)) r[etat] = await verifier(base + etat);
  const c = e => compte[e] || { sans: 0, avec: 0, corps: [] };

  console.log('\n1. La fonction en place');
  dire(r['en-place'].code === 0 && /✅/.test(r['en-place'].sortie), 'vert, sortie 0');
  dire(c('en-place').sans === 1 && c('en-place').avec === 1, 'une question comme la tâche (sans clé), puis une comme le jeu (avec)');
  dire(c('en-place').corps.every(b => b === '{"etat":true}'), 'on ne demande que l\'état : { etat:true }, jamais un essai ni un passage');

  console.log('\n2. L\'ancienne fonction ne se réveille jamais');
  dire(r['porte-fermee'].code === 1 && /encore fermée/.test(r['porte-fermee'].sortie), 'porte encore fermée : rouge, et dit pourquoi');
  dire(c('porte-fermee').avec === 0, 'tant que la tâche est refusée, AUCUN appel avec la clé du jeu (vu : ' + c('porte-fermee').avec + ')');
  dire(c('porte-fermee').sans === 4, 'la question sans clé, elle, se repose sans risque (4 essais)');
  dire(r['ancienne-ouverte'].code === 1 && /URGENT/.test(r['ancienne-ouverte'].sortie), 'ancienne fonction sans porte : rouge, URGENT');
  dire(c('ancienne-ouverte').sans + c('ancienne-ouverte').avec === 1, 'et un seul appel, pas un de plus (vu : ' + (c('ancienne-ouverte').sans + c('ancienne-ouverte').avec) + ')');

  console.log('\n3. Un déploiement qui met quelques secondes à prendre');
  dire(r['tardive'].code === 0, 'vert au troisième essai');
  dire(c('tardive').avec === 1, 'la clé du jeu n\'arrive qu\'une fois la bonne version vue');

  console.log('\n4. Ce qui ne va pas est nommé');
  dire(r['jeu-refuse'].code === 1 && /pas au jeu/.test(r['jeu-refuse'].sortie), 'la tâche passe mais pas le jeu');
  dire(r['vapid'].code === 1 && /VAPID_PRIVEE est absente/.test(r['vapid'].sortie) && /Edge Functions → Secrets/.test(r['vapid'].sortie), 'secrets VAPID : lequel, et où le corriger');
  dire(r['autre-cle'].code === 1 && r['autre-cle'].sortie.includes(PUB), 'autre clé publique que celle du jeu : la bonne est donnée en entier');
  dire(r['version-avant'].code === 1 && new RegExp('v' + (VERSION - 1) + ', pas la v' + VERSION).test(r['version-avant'].sortie), 'une version d\'avant');
  dire(r['absente'].code === 1 && /n'existe pas/.test(r['absente'].sortie), 'une fonction absente');
  const personne = await verifier('http://127.0.0.1:9/x');
  dire(personne.code === 1 && /ne répond pas/.test(personne.sortie), 'personne au bout');
  dire(!Object.values(r).some(x => /sb_secret_|service_role|sbp_[0-9a-f]{8}/.test(x.sortie)), 'aucune sortie ne contient de clé secrète');
  serveur.close();

  console.log('\n5. Le workflow');
  const wf = fs.readFileSync(path.join(RACINE, '.github/workflows/rappels.yml'), 'utf8');
  const deploie = wf.split('\n').filter(l => /supabase functions deploy/.test(l));
  dire(deploie.length === 1 && /--no-verify-jwt/.test(deploie[0]) && /\brappels\b/.test(deploie[0]),
       'une seule commande de déploiement, et « Verify JWT » s\'en va DANS la même');
  dire(/cp notifications\/rappels\.ts "\$P\/supabase\/functions\/rappels\/index\.ts"/.test(wf), 'c\'est bien notifications/rappels.ts qui part');
  const jetons = wf.match(/SUPABASE_ACCESS_TOKEN:.*/g) || [];
  dire(jetons.length >= 2 && jetons.every(l => /\$\{\{ secrets\.SUPABASE_ACCESS_TOKEN \}\}/.test(l)), 'le jeton ne vient que des secrets de GitHub');
  dire(!/sbp_[0-9a-f]{40}|sb_secret_|service_role/.test(wf), 'aucune clé écrite dans le workflow');
  dire(/CLI_VERSION: \d+\.\d+\.\d+\n/.test(wf) && /CLI_SHA256: [0-9a-f]{64}\n/.test(wf) && /sha256sum -c -/.test(wf), 'l\'outil Supabase est figé et vérifié à l\'octet');
  dire(/paths:[\s\S]*- notifications\/rappels\.ts[\s\S]*workflow_dispatch:/.test(wf), 'il part quand rappels.ts change, et à la main');
  dire(/node notifications\/verifier\.js/.test(wf), 'et vérifie la fonction en ligne après coup');
  dire(/\$\{\{ secrets\.SUPABASE_ACCESS_TOKEN \}\}[\s\S]*pret=non[\s\S]*::notice::/.test(wf), 'sans jeton : rien ne part, et il le dit sans passer au rouge');

  console.log(ko === 0 ? '\n  OK — le vérificateur dit vrai, et ne réveille jamais l\'ancienne fonction' : '\n  ' + ko + ' défaut(s)');
  process.exit(ko === 0 ? 0 : 1);
})();
