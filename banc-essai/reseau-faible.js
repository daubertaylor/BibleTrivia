/* ====== BANC « LE JEU SE LANCE MÊME QUAND LE RÉSEAU EST MAUVAIS » ======
   « Lorsque j'ai pas une bonne connexion, le jeu ne se lance pas. Je suis
   obligé de mettre le mode avion. » (Taylor, 30/09/2026.)

   LE MODE AVION ÉTAIT LE BON INDICE. Sans réseau du tout, une requête échoue
   tout de suite et le service worker sert le jeu depuis son cache. Avec un
   réseau qui répond À PEINE, la même requête ne réussit ni n'échoue : elle
   attend. Et le service worker demandait la page au réseau D'ABORD, sans
   limite de temps — il attendait avec elle. Une page de 2,8 Mo sur un réseau
   lent mais vivant, c'est pareil : une minute avant la première image.

   CE BANC JOUE LE VRAI SCÉNARIO, avec le vrai service worker :
     1. le jeu est ouvert une fois sur un bon réseau (il s'installe, son cache
        se remplit) ;
     2. le réseau devient PENDU — le serveur accepte la connexion et ne répond
        jamais, comme une barre de réseau qui ment : le jeu doit s'afficher
        quand même, et vite ;
     3. le réseau devient LENT — 40 Ko/s, la page arriverait en une minute :
        même exigence ;
     4. une NOUVELLE VERSION est publiée, réseau revenu : elle doit arriver
        toute seule. Servir le cache d'abord ne doit jamais bloquer les mises
        à jour.
   Le script Supabase (cdn.jsdelivr.net) est détourné vers un serveur muet :
   un CDN qui ne répond pas ne doit rien retenir non plus.
   Usage : node banc-essai/reseau-faible.js
*/
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const http = require('http'), net = require('net'), fs = require('fs'), path = require('path');

const RACINE = path.resolve(__dirname, '..');
const DELAI = 12000;                       // au-delà, pour un joueur, « le jeu ne se lance pas »
const etat = { mode: 'normal', version: null, pendus: [] };
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json', '.png': 'image/png', '.woff2': 'font/woff2' };

function contenu(fichier) {
  let b = fs.readFileSync(fichier);
  if (etat.version && /(?:index\.html|sw\.js)$/.test(fichier)) {
    b = Buffer.from(b.toString('utf8')
      .replace(/const CACHE = "yada-v\d+";/, 'const CACHE = "yada-' + etat.version + '";')
      .replace(/const VERSION_JEU = "v\d+";/, 'const VERSION_JEU = "' + etat.version + '";'), 'utf8');
  }
  return b;
}

const serveur = http.createServer((req, res) => {
  if (etat.mode === 'pendu') { etat.pendus.push(res); return; }          // on ne répond JAMAIS
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p.endsWith('/')) p += 'index.html';
  const f = path.join(RACINE, p);
  if (!f.startsWith(RACINE) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); res.end(); return; }
  const corps = contenu(f);
  /* Comme GitHub Pages : dix minutes de cache HTTP. C'est ce qui piège une
     mise à jour si le service worker ne demande pas explicitement du frais. */
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream',
                       'Content-Length': corps.length, 'Cache-Control': 'max-age=600' });
  if (etat.mode !== 'lent') { res.end(corps); return; }
  let i = 0;                                                             // 4 Ko toutes les 100 ms
  const t = setInterval(() => {
    if (res.destroyed) { clearInterval(t); return; }
    res.write(corps.subarray(i, i + 4096)); i += 4096;
    if (i >= corps.length) { clearInterval(t); res.end(); }
  }, 100);
  etat.pendus.push(res);
});
/* Le « CDN » : TLS vers un serveur qui se tait (pendu) ou raccroche (normal). */
const muets = [];
const cdn = net.createServer((s) => { if (etat.mode === 'normal') s.destroy(); else muets.push(s); });

(async () => {
  await new Promise(r => serveur.listen(0, '127.0.0.1', r));
  await new Promise(r => cdn.listen(0, '127.0.0.1', r));
  const URL = 'http://127.0.0.1:' + serveur.address().port + '/';
  const nav = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
    args: ['--host-resolver-rules=MAP cdn.jsdelivr.net 127.0.0.1:' + cdn.address().port] });
  const ctx = await nav.newContext({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 2,
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
    hasTouch: true });
  await ctx.addInitScript(() => {
    localStorage.setItem('bt_profile', JSON.stringify({ name: 'Taylor', color: '#4C86E8' }));
    localStorage.setItem('bt_fs_hint', '1');
  });
  let ko = 0;
  const v = (nom, bon, det) => { if (!bon) ko++; console.log('  ' + (bon ? 'OK ' : 'KO ') + nom.padEnd(58) + (det || '')); };
  const accueil = (p, delai) => p.waitForFunction(() => { try { return state.screen === 'mode'; } catch (e) { return false; } }, null, { timeout: delai });

  /* DES HEURES PLUS TARD. Le serveur annonce dix minutes de cache HTTP, comme
     GitHub Pages : tant qu'elles courent, le navigateur ne demande même rien
     au réseau, et le premier essai de ce banc a vu le jeu s'ouvrir « pendu »
     en 4 secondes — faux vert. Un joueur rouvre l'app des heures après : ce
     cache-là est périmé. On le vide donc avant chaque étape (le cache du
     service worker, lui, reste : c'est lui qui doit sauver le lancement). */
  async function viderCacheHttp() {
    const p = await ctx.newPage(); const cdp = await ctx.newCDPSession(p);
    await cdp.send('Network.clearBrowserCache'); await p.close();
  }
  /* Ouvre le jeu et mesure le temps jusqu'à l'écran d'accueil (splash compris). */
  async function lancer(nom, garderCacheHttp) {
    if (nom !== 'installation' && !garderCacheHttp) await viderCacheHttp();
    const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
    const t0 = Date.now(); let ms = null;
    try { await p.goto(URL, { waitUntil: 'commit', timeout: DELAI }); await accueil(p, Math.max(1000, DELAI - (Date.now() - t0))); ms = Date.now() - t0; }
    catch (e) {}
    return { p, ms, errs };
  }

  /* 1. Bon réseau : le jeu s'installe. */
  {
    const { p, ms } = await lancer('installation');
    v('bon réseau : le jeu s\'ouvre', ms !== null, ms !== null ? ms + ' ms' : 'pas d\'accueil');
    const pret = await p.waitForFunction(async () => {
      try { const c = await caches.keys(); if (!c.length) return false;
            return !!(navigator.serviceWorker.controller && await caches.match('index.html')); } catch (e) { return false; }
    }, null, { timeout: 30000, polling: 500 }).then(() => true, () => false);
    v('le service worker contrôle la page, la page est en cache', pret);
    await p.close();
  }

  /* 2. Réseau pendu. */
  etat.mode = 'pendu';
  {
    const { p, ms, errs } = await lancer('pendu');
    v('réseau PENDU : le jeu s\'ouvre quand même', ms !== null, ms !== null ? ms + ' ms' : 'rien après ' + DELAI + ' ms — c\'est le « il ne se lance pas »');
    /* L'icône : la mesure part après l'écran de chargement, ne revient jamais,
       et la limite de six secondes la classe « faible ». */
    const icone = ms === null ? null : await p.waitForSelector('.screen.accueil .hero-reseau', { timeout: 16000 })
      .then(el => el.getAttribute('data-reseau'), () => null);
    v('réseau PENDU : l\'icône « connexion faible » apparaît', icone === 'faible', String(icone));
    if (icone) {
      await p.click('.screen.accueil .hero-reseau');
      const titre = await p.waitForSelector('.modal-title', { timeout: 3000 }).then(el => el.textContent(), () => null);
      v('toucher l\'icône explique ce qui se passe', titre === 'Connexion faible', String(titre));
      await p.screenshot({ path: '/tmp/reseau-faible-fenetre.png' }).catch(() => {});
    }
    if (errs.length) v('aucune erreur de page', false, errs.slice(0, 2).join(' | '));
    await p.close().catch(() => {});
  }
  etat.pendus.splice(0).forEach(r => { try { r.destroy(); } catch (e) {} });
  muets.splice(0).forEach(s => s.destroy());

  /* 3. Réseau lent. */
  etat.mode = 'lent';
  {
    const { p, ms } = await lancer('lent');
    v('réseau LENT (40 Ko/s) : le jeu s\'ouvre quand même', ms !== null, ms !== null ? ms + ' ms' : 'rien après ' + DELAI + ' ms');
    await p.close().catch(() => {});
  }
  etat.pendus.splice(0).forEach(r => { try { r.destroy(); } catch (e) {} });
  muets.splice(0).forEach(s => s.destroy());

  /* 4. Nouvelle version, réseau revenu : elle doit arriver toute seule. */
  etat.mode = 'normal'; etat.version = 'vESSAI';
  {
    const { p, ms } = await lancer('mise à jour');
    v('réseau revenu : le jeu s\'ouvre', ms !== null, ms !== null ? ms + ' ms' : '');
    const arrivee = await p.waitForFunction(() => { try { return VERSION_JEU === 'vESSAI'; } catch (e) { return false; } },
      null, { timeout: 40000, polling: 500 }).then(() => true, () => false);
    v('la nouvelle version arrive sans rien toucher', arrivee);
    await p.close().catch(() => {});
  }

  /* 5. Une version publiée MOINS DE DIX MINUTES après la dernière ouverture :
     le cache HTTP garde encore l'ancienne page. Le service worker doit quand
     même ranger la nouvelle — c'est le « cache: reload » de l'installation.
     Sans lui, ce cas-là restait bloqué sur l'ancienne version. */
  etat.version = 'vESSAI2';
  {
    const { p } = await lancer('mise à jour rapprochée', true);
    const arrivee = await p.waitForFunction(() => { try { return VERSION_JEU === 'vESSAI2'; } catch (e) { return false; } },
      null, { timeout: 40000, polling: 500 }).then(() => true, () => false);
    const cle = await p.evaluate(async () => (await caches.keys()).join(','));
    v('une version publiée dans les dix minutes arrive aussi', arrivee, 'caches : ' + cle);
    await p.close().catch(() => {});
  }

  /* 6. Coupure franche, puis retour : l'icône suit le réseau, sans rendu de
     l'accueil (elle se pose et se retire à sa place). */
  {
    const { p, ms } = await lancer('coupure');
    v('réseau normal : le jeu s\'ouvre, sans icône', ms !== null && !(await p.$('.hero-reseau')), ms + ' ms');
    await p.waitForTimeout(6500);                                    // la première mesure est passée : « bon »
    const avant = await p.evaluate(() => { window.__rendus = 0; const r = render; render = function () { window.__rendus++; return r.apply(this, arguments); }; return RESEAU.etat; });
    await ctx.setOffline(true);
    const coupe = await p.waitForSelector('.screen.accueil .hero-reseau[data-reseau="coupe"]', { timeout: 5000 }).then(() => true, () => false);
    v('coupure : l\'icône « pas de connexion » apparaît aussitôt', avant === 'bon' && coupe, 'avant : ' + avant);
    await p.screenshot({ path: '/tmp/reseau-coupe.png' }).catch(() => {});
    await ctx.setOffline(false);
    const partie = await p.waitForFunction(() => !document.querySelector('.hero-reseau'), null, { timeout: 12000 }).then(() => true, () => false);
    v('retour du réseau : l\'icône s\'en va', partie);
    const rendus = await p.evaluate(() => window.__rendus);
    v('l\'accueil ne s\'est pas redessiné pour une icône', rendus === 0, rendus + ' rendu(s)');
    const sondes = await p.evaluate(async () => { let n = 0; for (const k of await caches.keys()) { for (const r of await (await caches.open(k)).keys()) if (/sonde=/.test(r.url)) n++; } return n; });
    v('la mesure du réseau ne laisse rien dans le cache', sondes === 0, sondes + ' copie(s)');
    await p.close().catch(() => {});
  }

  /* 7. UN TÉLÉPHONE OCCUPÉ N'EST PAS UN RÉSEAU LENT. La sonde prenait l'heure
     d'arrivée au moment où le JavaScript LISAIT la réponse : un fil principal
     pris ailleurs pendant deux secondes et demie lui faisait conclure
     « faible » sur un réseau parfait — l'icône s'allumait pour rien. On lance
     une mesure, on occupe le fil pendant qu'elle court, et on regarde ce
     qu'elle en conclut. Le témoin, c'est l'horloge du fil : elle DOIT avoir
     vu plus de deux secondes, sinon l'épreuve n'a rien éprouvé. */
  {
    const { p } = await lancer('occupé');
    await p.waitForTimeout(6500);                                    // la première mesure est passée
    const r = await p.evaluate(async () => {
      const avant = RESEAU.etat, t0 = Date.now();
      sonderReseau();
      const fin = Date.now() + 2500; while (Date.now() < fin) {}     // le fil est pris
      await new Promise(res => { const t = setInterval(() => { if (!RESEAU.enCours) { clearInterval(t); res(); } }, 50); });
      return { avant, apres: RESEAU.etat, fil: Date.now() - t0 };
    });
    v('téléphone occupé pendant la mesure : réseau toujours bon', r.avant === 'bon' && r.apres === 'bon' && r.fil > 2000,
      'horloge du fil ' + r.fil + ' ms, verdict ' + r.apres);
    await p.close().catch(() => {});
  }

  await nav.close();
  serveur.close(); cdn.close();
  console.log(ko ? '\n  ' + ko + ' KO' : '\n  OK — le jeu se lance quel que soit le réseau, et les mises à jour passent');
  process.exit(ko ? 1 : 0);
})();
