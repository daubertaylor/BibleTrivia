/* ====== L'APP INSTALLÉE S'OUVRE AUSSI CHEZ CLOUDFLARE (v352) ======
   yadaquiz.app passe de GitHub Pages au site « yada » de Cloudflare. Celui-ci
   ne sert pas les pages comme GitHub : /index.html y répond « va voir / »
   (307), /x.html « va voir /x », et /x sert x.html. Le service worker rangeait
   la page avec la trace de ce détour ; servie à l'ouverture de l'app, Safari
   et Chrome la refusent, et l'app installée ne s'ouvre plus.
   Le banc sert le jeu EXACTEMENT comme Cloudflare (son propre petit serveur,
   mêmes redirections, mêmes en-têtes de cache), et vérifie, sur un iPhone :
     1. le service worker s'installe et prend la main ;
     2. la page rangée ne garde aucune trace de détour ;
     3. l'app se rouvre depuis son cache — par / comme par /index.html ;
     4. hors ligne aussi ;
     5. la Confidentialité (/confidentialite.html → /confidentialite) s'ouvre,
        elle, et pas le jeu ;
     6. une copie rangée AVEC son détour (par une version d'avant) guérit :
        l'app s'ouvre quand même ;
     7. aucune erreur.
   Usage : node banc-essai/sw-detour.js [url, ignorée] [dossier du jeu] */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const RACINE = path.resolve(process.argv[3] || path.join(__dirname, '..'));
let ko = 0;
const dit = (q, b, d) => { if (!b) ko++; console.log('  ' + (b ? 'OK  ' : 'KO  ') + q + (d ? '   (' + String(d).slice(0, 420) + ')' : '')); };

const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'application/javascript', '.json': 'application/json', '.png': 'image/png',
  '.woff2': 'font/woff2', '.txt': 'text/plain; charset=utf-8', '.css': 'text/css', '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json' };
const redirections = [];
/* Le serveur de Cloudflare (Workers, « auto-trailing-slash ») : */
function cloudflare(req, res) {
  const u = new URL(req.url, 'http://x'); const p = decodeURIComponent(u.pathname);
  const envoyer = (f) => {
    fs.readFile(f, (err, b) => {
      if (err) { res.writeHead(404); res.end('404'); return; }
      res.writeHead(200, { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream', 'cache-control': 'public, max-age=0, must-revalidate' });
      res.end(b);
    });
  };
  const vers = (loc) => { redirections.push(p + ' → ' + loc); res.writeHead(307, { location: loc + u.search }); res.end(); };
  if (p.includes('..')) { res.writeHead(400); res.end(); return; }
  if (/(^|\/)index\.html$/.test(p)) return vers(p.replace(/index\.html$/, ''));
  if (/\.html$/.test(p)) return vers(p.replace(/\.html$/, ''));
  const f = path.join(RACINE, p);
  if (p.endsWith('/')) return envoyer(path.join(f, 'index.html'));
  if (fs.existsSync(f) && fs.statSync(f).isFile()) return envoyer(f);
  if (fs.existsSync(f + '.html')) return envoyer(f + '.html');
  if (fs.existsSync(f) && fs.statSync(f).isDirectory()) return vers(p + '/');
  res.writeHead(404); res.end('404');
}

(async () => {
  const serveur = http.createServer(cloudflare);
  await new Promise((ok) => serveur.listen(0, '127.0.0.1', ok));
  const BASE = 'http://127.0.0.1:' + serveur.address().port + '/';
  const nav = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const errs = [];
  try {
    const ctx = await nav.newContext({ viewport: { width: 393, height: 852 }, isMobile: true, hasTouch: true, serviceWorkers: 'allow' });
    const p = await ctx.newPage();
    p.on('pageerror', (e) => errs.push(e.message));
    await p.route('**/supabase-js@2*', (r) => r.fulfill({ status: 200, contentType: 'application/javascript', body: '' }));
    await p.route('**/pagead2.googlesyndication.com/**', (r) => r.abort());
    await p.addInitScript(() => { if (!/^http/.test(location.protocol)) return; localStorage.setItem('bt_profile', JSON.stringify({ name: 'Taylor', color: '#4C86E8' })); localStorage.setItem('bt_fs_hint', '1'); });
    const jeuPret = () => p.waitForFunction(() => { try { return state.screen === 'mode'; } catch (e) { return false; } }, null, { timeout: 25000 }).then(() => true).catch(() => false);
    const ouvrir = async (adr) => { try { await p.goto(adr); return await jeuPret(); } catch (e) { errs.push('ouverture ' + adr + ' : ' + e.message.split('\n')[0]); return false; } };

    /* 1 */
    const premier = await ouvrir(BASE);
    const pret = await p.evaluate(async () => { try { await Promise.race([navigator.serviceWorker.ready, new Promise((_, n) => setTimeout(() => n(new Error('pas prêt')), 20000))]); return true; } catch (e) { return String(e.message); } });
    await p.waitForTimeout(500);
    const deuxieme = await ouvrir(BASE);
    const pilote = await p.evaluate(() => !!navigator.serviceWorker.controller);
    dit('1. le service worker s\'installe et prend la main', premier && pret === true && deuxieme && pilote, JSON.stringify({ premier, pret, deuxieme, pilote }));

    /* 2 */
    const range = await p.evaluate(async () => {
      const noms = (await caches.keys()).filter((k) => /^yada-/.test(k));
      const c = await caches.open(noms[0]);
      const page = await c.match(new URL('index.html', location.origin + '/').href), racine = await c.match(location.origin + '/');
      return { noms, page: page ? { detour: page.redirected, statut: page.status, type: page.headers.get('content-type') } : null, racine: racine ? racine.redirected : null };
    });
    dit('2. la page rangée ne garde aucune trace de détour (Cloudflare a bien redirigé /index.html)',
      range.noms.length === 1 && range.page && range.page.detour === false && range.page.statut === 200 && /text\/html/.test(range.page.type) && range.racine === false
      && redirections.some((r) => /^\/index\.html → \/$/.test(r)), JSON.stringify({ range, redirections: redirections.slice(0, 4) }));

    /* 3 */
    const parRacine = await ouvrir(BASE);
    const parIndex = await ouvrir(BASE + 'index.html');
    const ici = p.url();
    dit('3. l\'app se rouvre depuis son cache, par / comme par /index.html', parRacine && parIndex, JSON.stringify({ parRacine, parIndex, ici }));

    /* 4 */
    await ctx.setOffline(true);
    const horsLigne = await ouvrir(BASE);
    await ctx.setOffline(false);
    dit('4. hors ligne aussi', horsLigne, JSON.stringify({ horsLigne }));

    /* 5 */
    let conf = null;
    try {
      await p.goto(BASE + 'confidentialite.html'); await p.waitForTimeout(400);
      conf = await p.evaluate(() => ({ titre: document.title, jeu: typeof window.state !== 'undefined', adresse: location.pathname }));
    } catch (e) { errs.push('confidentialité : ' + e.message.split('\n')[0]); }
    const aConf = fs.existsSync(path.join(RACINE, 'confidentialite.html'));
    dit('5. la Confidentialité (/confidentialite.html → /confidentialite) s\'ouvre, elle, et pas le jeu',
      !aConf || (!!conf && conf.titre === 'Yada — Confidentialité et mentions légales' && !conf.jeu && conf.adresse === '/confidentialite'), JSON.stringify({ aConf, conf }));

    /* 6 */
    const pose = await p.evaluate(async () => {
      const noms = (await caches.keys()).filter((k) => /^yada-/.test(k));
      const c = await caches.open(noms[0]);
      /* « ?sonde » : le service worker laisse passer (voir sonderReseau), on va donc bien
         au serveur, qui redirige. */
      const r = await fetch('/index.html?sonde=1', { cache: 'no-store' });
      await c.put(new URL('index.html', location.origin + '/').href, r);
      const relu = await c.match(new URL('index.html', location.origin + '/').href);
      return { detour: r.redirected, relu: relu && relu.redirected };
    });
    const gueri = await ouvrir(BASE);
    dit('6. une copie rangée AVEC son détour (par une version d\'avant) guérit : l\'app s\'ouvre quand même', pose.detour === true && pose.relu === true && gueri, JSON.stringify({ pose, gueri }));
    await ctx.close();
  } catch (e) { ko++; console.log('  KO  le banc a échoué : ' + e.message); }
  dit('7. aucune erreur', !errs.length, errs.slice(0, 3).join(' | '));
  await nav.close(); serveur.close();
  console.log(ko ? '\n  ' + ko + ' défaut(s)' : '\n  OK — servie comme chez Cloudflare, l\'app installée s\'ouvre, hors ligne aussi, et la Confidentialité reste la Confidentialité');
  process.exit(ko ? 1 : 0);
})();
