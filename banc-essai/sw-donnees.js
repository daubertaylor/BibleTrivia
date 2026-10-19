/* ====== BANC « LE SERVICE WORKER NE GARDE PAS LES DONNÉES DU SERVEUR » (v329) ======
   « Lorsque je suis déconnecté et reconnecté, mes messages ne s'affichent plus
     pour les autres. » Le service worker servait TOUTES les lectures depuis
   son cache, celles du serveur comprises : la liste des messages d'un
   groupe, lue une fois, était resservie telle quelle à chaque retour sur
   l'app — jusqu'à la version suivante du jeu. Les autres bancs bloquent le
   service worker : aucun ne pouvait le voir. Celui-ci le laisse faire, avec
   le vrai sw.js, dans un vrai navigateur, et un faux serveur de données sur
   une autre origine (comme Supabase) qui compte ses appels :
     1. trois lectures du serveur : trois appels, trois réponses fraîches ;
     2. hors ligne, une lecture du serveur ÉCHOUE (elle n'est pas inventée
        depuis un vieux cache) ;
     3. les fichiers du jeu, eux, restent gardés : hors ligne, ils se lisent ;
     4. la bibliothèque Supabase du CDN reste gardée (le jeu hors ligne en a
        besoin), et rien d'autre d'une autre origine.
   Usage : node banc-essai/sw-donnees.js [url] */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const http = require('http');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const URL_JEU = process.argv[2] || 'http://127.0.0.1:8099/index.html';
const PORT_DONNEES = 8093;
let ko = 0;
const dire = (bon, txt) => { if (!bon) ko++; console.log('  ' + (bon ? 'OK  ' : 'KO  ') + txt); };

let appels = 0;
const donnees = http.createServer((rq, rs) => {
  appels++;
  rs.writeHead(200, { 'content-type': 'application/json', 'access-control-allow-origin': '*', 'access-control-allow-headers': '*' });
  rs.end(JSON.stringify({ appel: appels }));
});

(async () => {
  await new Promise(r => donnees.listen(PORT_DONNEES, '127.0.0.1', r));
  const nav = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  try {
    const ctx = await nav.newContext({ serviceWorkers: 'allow' });
    const p = await ctx.newPage();
    await p.route('**/supabase-js@2*', (r) => r.fulfill({ status: 200, contentType: 'application/javascript', body: '' }));
    await p.goto(URL_JEU);
    const pris = await p.waitForFunction(() => navigator.serviceWorker && navigator.serviceWorker.controller, null, { timeout: 20000 }).then(() => true).catch(() => false);
    if (!pris) { await p.reload(); await p.waitForFunction(() => !!navigator.serviceWorker.controller, null, { timeout: 30000 }); }
    const lire = () => p.evaluate((port) => fetch('http://127.0.0.1:' + port + '/rest/v1/messages?select=id&groupe=eq.g1', { headers: { apikey: 'x', Authorization: 'Bearer y' } })
      .then(r => r.json()).catch(e => ({ erreur: String(e) })), PORT_DONNEES);

    /* 1 */
    const avant = appels;
    const l = [await lire(), await lire(), await lire()];
    dire(appels - avant === 3 && new Set(l.map(x => x.appel)).size === 3,
      '1. trois lectures du serveur : ' + (appels - avant) + ' appel(s), réponses ' + l.map(x => x.appel).join(', '));

    /* 2 & 3 */
    await p.evaluate(() => fetch('manifest.json').then(r => r.text()));
    await ctx.setOffline(true);
    const horsLigne = await lire();
    const fichier = await p.evaluate(() => fetch('manifest.json').then(r => r.ok ? r.text() : '').then(t => t.length).catch(() => 0));
    await ctx.setOffline(false);
    dire(!!horsLigne.erreur, '2. hors ligne, une lecture du serveur échoue — rien d\'inventé depuis un vieux cache (' + JSON.stringify(horsLigne).slice(0, 60) + ')');
    dire(fichier > 20, '3. hors ligne, les fichiers du jeu se lisent toujours (manifest.json, ' + fichier + ' octets)');
    await ctx.close();
  } finally { await nav.close(); donnees.close(); }

  /* 4 : la règle elle-même, lue dans sw.js — le CDN de supabase-js est
     gardé, Supabase et les autres origines ne le sont pas. */
  const ecoute = {};
  const self = { location: new URL('https://daubertaylor.github.io/BibleTrivia/sw.js'), registration: { scope: 'https://daubertaylor.github.io/BibleTrivia/' },
    addEventListener: (n, f) => { ecoute[n] = f; }, skipWaiting(){}, clients: { claim(){} } };
  const ctxVm = { self, caches: { match: () => Promise.resolve(null), open: () => Promise.resolve({ put(){}, match: () => Promise.resolve(null) }) }, fetch: () => Promise.resolve(new Response('')),
    URL, Request: function(){}, Response, console, setTimeout, Promise, Date, Math, JSON, indexedDB: {} };
  vm.createContext(ctxVm);
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'sw.js'), 'utf8'), ctxVm);
  const garde = (url) => { let pris = false; ecoute.fetch({ request: { method: 'GET', url, mode: 'cors' }, respondWith: () => { pris = true; } }); return pris; };
  const cas = [['https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2', true], ['https://daubertaylor.github.io/BibleTrivia/questions-en.js', true],
    ['https://chyuckryusxzssezesuw.supabase.co/rest/v1/messages?select=id', false], ['https://chyuckryusxzssezesuw.supabase.co/auth/v1/user', false],
    ['https://exemple.org/image.png', false]];
  const faux = cas.filter(([u, attendu]) => garde(u) !== attendu);
  dire(!faux.length, '4. gardés : les fichiers du jeu et supabase-js du CDN ; jamais Supabase ni une autre origine' + (faux.length ? ' — faux pour ' + faux.map(x => x[0]).join(', ') : ''));

  console.log(ko ? '\n  ' + ko + ' défaut(s)' : '\n  OK — le service worker garde les fichiers du jeu, jamais les données du serveur');
  process.exit(ko ? 1 : 0);
})().catch((e) => { console.error(e); try { donnees.close(); } catch (x) {} process.exit(1); });
