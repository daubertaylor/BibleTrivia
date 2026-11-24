/* ====== LE SITE POUR GOOGLE ET POUR ADSENSE (v380) ======
   « Google AdSense a trouvé quelques violations de la politique… vérifie
     d'où ça peut venir. » « La page confidentialité… vraiment un lien
     différent, une page différente à la place d'être collée dans celle du
     jeu, pour que je puisse copier-coller le lien et la donner à AdSense. »
   Les adresses yadaquiz.app, daubertaylor.github.io et workers.dev sont
   jouées par le banc avec les fichiers de ce dossier (rien ne sort), et un
   « vrai navigateur » est imité (navigator.webdriver faux) : c'est là que
   le code des annonces décide. Toute demande à Google est coupée net et
   comptée — rien ne part chez Google.
     1. LE CODE D'ANNONCE DU JEU EST EN PAUSE PENDANT L'EXAMEN D'ADSENSE
        (PUB_JEU = false ; les annonces de fin de partie reviendront) : à
        yadaquiz.app, dans un vrai navigateur, le script de Google n'est pas
        posé et aucune demande ne part ; la balise google-adsense-account
        reste ; la description tient en 155 signes ; les liens du site mènent
        aussi aux mentions légales et au contact ;
     2. LES PAGES À LIRE PORTENT LE CODE (quiz par livre, un livre, guide,
        FAQ, À propos, nouveautés) : une demande, une seule, au script du
        compte ; aucune dans un automate, aucune à une autre adresse, aucune
        quand le jeu montre la page (cadre) ;
     3. LES PAGES LÉGALES, LA 404 ET L'ANCIENNE PAGE D'ESSAI N'EN PORTENT
        AUCUN ;
     4. « MES CHOIX DE PUBLICITÉ » : caché ; il paraît quand l'outil de
        consentement de Google est prêt et rouvre son message ; absent des
        pages sans annonces ;
     5. CHAQUE PAGE A SON ADRESSE : la confidentialité, les mentions légales
        et le contact, servis à part, titrés, décrits, chacun son adresse de
        référence ; les mentions disent l'éditeur, son adresse, son
        téléphone, l'e-mail de Yada et les hébergeurs ; le contact donne
        l'e-mail et ne montre ni adresse ni téléphone ;
     6. DANS LE JEU, L'ADRESSE EN TOUTES LETTRES : la Confidentialité et les
        Mentions légales montrent leur adresse ; « Copier le lien » copie
        l'adresse complète ; « Ouvrir » montre la page dans le jeu ; la ligne
        « La publicité » dit les deux endroits des annonces (entre deux
        parties, et sur les pages à lire du site) ;
     7. UNE SEULE ADRESSE : une page du site ouverte à github.io ou à
        workers.dev renvoie à la même page sur yadaquiz.app ; le jeu, lui,
        reste (la progression d'un ancien joueur est là) ; une page montrée
        dans le jeu reste aussi ;
     8. TITRES ET DESCRIPTIONS : 60 et 155 signes au plus, partout ;
        robots.txt ferme les dossiers internes (pas l'ancienne page d'essai :
        Google doit y lire le renvoi pour l'oublier), annonce le plan et
        n'interdit pas tout ; le plan liste les pages légales, pas la 404 ;
     9. LA PAGE 404 ramène au jeu et au site (liens absolus), sans être
        indexée ; L'ANCIENNE PAGE D'ESSAI renvoie au jeu, sans être indexée,
        sans rien qui tourne ni touche à la mémoire ;
    10. aucune erreur.
   Usage : node banc-essai/seo.js [url du jeu] */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const fs = require('fs');
const path = require('path');
const URL_JEU = process.argv[2] || 'http://127.0.0.1:8099/index.html';
const LOCAL = new URL('./', URL_JEU).href;
const RACINE = path.resolve(__dirname, '..');
let ko = 0;
const dit = (q, b, d) => { if (!b) ko++; console.log('  ' + (b ? 'OK  ' : 'KO  ') + q + (d ? '   (' + String(d).slice(0, 500) + ')' : '')); };
const CLIENT = 'adsbygoogle.js?client=ca-pub-4777080561806498';
const HOTES = new Set(['yadaquiz.app', 'daubertaylor.github.io', 'yada.yadaquiz-app.workers.dev']);
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'application/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png',
  '.jpg': 'image/jpeg', '.webp': 'image/webp', '.woff2': 'font/woff2', '.svg': 'image/svg+xml', '.txt': 'text/plain', '.xml': 'application/xml', '.mp3': 'audio/mpeg', '.m4a': 'audio/mp4' };
/* Comme Cloudflare : « /x/ » sert x/index.html, « /x » sert x.html, sinon la page 404. */
function fichier(u) {
  let p = decodeURIComponent(u.pathname);
  if (u.hostname === 'daubertaylor.github.io') p = p.replace(/^\/BibleTrivia(?=\/|$)/, '');
  let rel = p.replace(/^\/+/, '');
  const essais = rel === '' || rel.endsWith('/') ? [rel + 'index.html'] : [rel, rel + '.html', rel + '/index.html'];
  for (const r of essais) { const f = path.join(RACINE, r); if (f.startsWith(RACINE) && fs.existsSync(f) && fs.statSync(f).isFile()) return { f, statut: 200 }; }
  return { f: path.join(RACINE, '404.html'), statut: 404 };
}
const net = (t) => String(t || '').replace(/ | /g, ' ').replace(/\s+/g, ' ').trim();
const deco = (t) => String(t || '').replace(/&#x27;/g, "'").replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');

(async () => {
  const nav = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const errs = [];
  /* Un contexte où les adresses du site sont jouées par le banc. */
  async function contexte(vrai, google) {
    const ctx = await nav.newContext({ viewport: { width: 393, height: 852 }, isMobile: true, hasTouch: true, serviceWorkers: 'block' });
    if (vrai) await ctx.addInitScript(() => { try { Object.defineProperty(Navigator.prototype, 'webdriver', { get: () => false, configurable: true }); } catch (e) {} });
    await ctx.addInitScript(() => { try { if (!/^http/.test(location.protocol)) return; localStorage.setItem('bt_profile', JSON.stringify({ name: 'Taylor', color: '#4C86E8' })); localStorage.setItem('bt_fs_hint', '1'); } catch (e) {} });
    await ctx.route('**/*', (r) => {
      let u; try { u = new URL(r.request().url()); } catch (e) { return r.abort(); }
      if (/googlesyndication\.com$|googleadservices\.com$|doubleclick\.net$|fundingchoicesmessages\.google\.com$|adtrafficquality\.google$/.test(u.hostname)) { google.push({ url: u.href }); return r.abort(); }
      if (/supabase-js@2/.test(u.href)) return r.fulfill({ status: 200, contentType: 'application/javascript', body: '' });
      if (u.hostname === '127.0.0.1' || u.hostname === 'localhost') return r.continue();
      if (HOTES.has(u.hostname)) {
        const { f, statut } = fichier(u);
        return r.fulfill({ status: statut, contentType: TYPES[path.extname(f)] || 'application/octet-stream', body: fs.readFileSync(f) });
      }
      return r.abort();
    });
    return ctx;
  }
  const page = async (ctx, nom) => { const p = await ctx.newPage(); p.on('pageerror', e => errs.push(nom + ' : ' + e.message)); return p; };
  try {
    /* ---------- 1. le jeu, dans un vrai navigateur, à yadaquiz.app ---------- */
    const g1 = [];
    const c1 = await contexte(true, g1);
    const p1 = await page(c1, 'jeu');
    await p1.goto('https://yadaquiz.app/');
    await p1.waitForFunction(() => { try { return state.screen === 'mode'; } catch (e) { return false; } }, null, { timeout: 30000 });
    await p1.waitForTimeout(1500);
    const r1 = await p1.evaluate(() => ({ pilote: navigator.webdriver, script: document.querySelectorAll('script[src*="adsbygoogle"]').length,
      compte: (document.querySelector('meta[name="google-adsense-account"]') || {}).content || null, pubJeu: typeof PUB_JEU !== 'undefined' ? PUB_JEU : 'absent' }));
    r1.google = g1.length;
    const brut = fs.readFileSync(path.join(RACINE, 'index.html'), 'utf8');
    const tete = brut.slice(0, brut.indexOf('</head>'));
    const desc = deco((tete.match(/<meta name="description" content="([^"]+)"/) || [])[1]);
    const ogd = deco((tete.match(/<meta property="og:description" content="([^"]+)"/) || [])[1]);
    const liens = (((brut.match(/<nav id="liens-site"[^>]*>([\s\S]*?)<\/nav>/) || [])[1] || '').match(/href="([^"]+)"/g) || []).map(h => h.slice(6, -1));
    r1.desc = desc.length; r1.liens = liens;
    dit('1. le code d\'annonce du jeu est en pause pendant l\'examen d\'AdSense : dans un vrai navigateur, à yadaquiz.app, pas de script de Google, aucune demande ; la balise du compte reste ; une description de 155 signes au plus ; les liens du site mènent aux mentions légales et au contact',
      r1.pilote === false && r1.script === 0 && r1.google === 0 && r1.compte === 'ca-pub-4777080561806498' && r1.pubJeu === false
      && desc.length >= 110 && desc.length <= 155 && ogd === desc && /quiz biblique/i.test(desc)
      && ['confidentialite', 'mentions-legales/', 'contact/'].every(h => liens.includes(h)), JSON.stringify(r1));

    /* 2 (dans le cadre du jeu) : la page montrée dans le jeu ne demande rien */
    const avantCadre = g1.length;
    await p1.evaluate(() => ouvrirSite('guide/', 'Guide'));
    await p1.waitForFunction(() => { const f = document.querySelector('#siteVeil .site-cadre'); try { return f && f.contentDocument && f.contentDocument.readyState === 'complete' && /guide/.test(f.contentWindow.location.href); } catch (e) { return false; } }, null, { timeout: 10000 });
    await p1.waitForTimeout(800);
    const cadre = await p1.evaluate(() => { const f = document.querySelector('#siteVeil .site-cadre'); return { url: f.contentWindow.location.href, script: f.contentDocument.querySelectorAll('script[src*="adsbygoogle"]').length }; });
    cadre.google = g1.length - avantCadre;
    await c1.close();

    /* ---------- 2. les pages à lire portent le code, une fois ---------- */
    const lire = ['quiz-biblique/', 'quiz-biblique/genese/', 'guide/', 'faq/', 'a-propos/', 'nouveautes/'];
    const g2 = [];
    const c2 = await contexte(true, g2);
    const p2 = await page(c2, 'pages');
    const r2 = {};
    for (const a of lire) {
      const n = g2.length;
      await p2.goto('https://yadaquiz.app/' + a); await p2.waitForTimeout(500);
      const s = await p2.evaluate(() => [...document.querySelectorAll('script[src*="adsbygoogle"]')].map(x => x.getAttribute('data-yada') + ' ' + x.async + ' ' + x.crossOrigin));
      r2[a] = { demandes: g2.slice(n).map(x => x.url.replace(/^https:\/\/pagead2\.googlesyndication\.com\/pagead\/js\//, '')), script: s };
    }
    /* un automate, et une autre adresse : rien */
    const g2b = [];
    const c2b = await contexte(false, g2b);
    const p2b = await page(c2b, 'automate');
    await p2b.goto('https://yadaquiz.app/guide/'); await p2b.waitForTimeout(500);
    await p2b.goto(LOCAL + 'guide/'); await p2b.waitForTimeout(500);
    await c2b.close();
    const g2c = [];
    const c2c = await contexte(true, g2c);
    const p2c = await page(c2c, 'local');
    await p2c.goto(LOCAL + 'faq/'); await p2c.waitForTimeout(500);
    await c2c.close();
    dit('2. les pages à lire portent le code du compte : une demande, une seule, sur chacune ; aucune dans un automate, aucune à une autre adresse, aucune quand le jeu montre la page',
      lire.every(a => r2[a].demandes.length === 1 && r2[a].demandes[0] === CLIENT && r2[a].script.length === 1 && r2[a].script[0] === 'annonces true anonymous')
      && g2b.length === 0 && g2c.length === 0 && cadre.google === 0 && cadre.script === 0 && /yadaquiz\.app\/guide\//.test(cadre.url),
      JSON.stringify({ r2, automate: g2b.length, local: g2c.length, cadre }));

    /* ---------- 3. ni les pages légales, ni la 404, ni l'essai ---------- */
    const sans = ['confidentialite', 'mentions-legales/', 'contact/', 'cette-page-nexiste-pas/', 'essai/'];
    const r3 = {};
    for (const a of sans) {
      const n = g2.length;
      await p2.goto('https://yadaquiz.app/' + a);
      if (a === 'essai/') { await p2.waitForURL(u => u.pathname === '/', { timeout: 8000 }).catch(() => {}); await p2.waitForLoadState('load').catch(() => {}); await p2.waitForTimeout(1200); }
      else await p2.waitForTimeout(500);
      r3[a] = { demandes: g2.length - n, url: p2.url().replace('https://yadaquiz.app/', '/'), choix: await p2.evaluate(() => !!document.getElementById('choix-pub')) };
    }
    dit('3. les pages légales, la page 404 et l\'ancienne page d\'essai ne portent aucun code d\'annonce (ni « Mes choix de publicité »)',
      sans.every(a => r3[a].demandes === 0 && !r3[a].choix), JSON.stringify(r3));

    /* ---------- 4. « Mes choix de publicité » ---------- */
    await p2.goto('https://yadaquiz.app/guide/'); await p2.waitForTimeout(400);
    const r4 = await p2.evaluate(async () => {
      const li = document.getElementById('choix-pub');
      const avant = { existe: !!li, cache: li && li.hidden, vu: li && li.offsetHeight > 0 };
      const file = (window.googlefc && window.googlefc.callbackQueue) || [];
      const prets = file.filter(x => x && typeof x.CONSENT_API_READY === 'function');
      /* Google arrive : son outil est prêt, sa file exécute ce qu'on lui donne */
      window.__revoque = 0;
      window.googlefc.showRevocationMessage = () => { window.__revoque++; };
      prets.forEach(x => x.CONSENT_API_READY());
      window.googlefc.callbackQueue = { push: (f) => { if (typeof f === 'function') f(); else if (f && f.CONSENT_API_READY) f.CONSENT_API_READY(); } };
      const b = li && li.querySelector('button');
      const apres = { cache: li && li.hidden, vu: li && li.offsetHeight > 0, mot: b && b.textContent, bord: b && getComputedStyle(b).borderTopWidth };
      if (b) b.click();
      await new Promise(r => setTimeout(r, 50));
      return { avant, prets: prets.length, apres, revoque: window.__revoque };
    });
    dit('4. « Mes choix de publicité » : caché d\'abord ; il paraît quand l\'outil de consentement de Google est prêt, sans bordure, et rouvre son message',
      r4.avant.existe && r4.avant.cache === true && r4.avant.vu === false && r4.prets === 1 && r4.apres.cache === false && r4.apres.vu === true
      && r4.apres.mot === 'Mes choix de publicité' && r4.apres.bord === '0px' && r4.revoque === 1, JSON.stringify(r4));
    await c2.close();

    /* ---------- 5. chaque page a son adresse ---------- */
    const c5 = await nav.newContext({ viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true, serviceWorkers: 'block' });
    await c5.route('**/pagead2.googlesyndication.com/**', r => r.abort());
    const p5 = await page(c5, 'légales');
    const r5 = {};
    for (const [a, f] of [['confidentialite', 'confidentialite.html'], ['mentions-legales/', 'mentions-legales/'], ['contact/', 'contact/']]) {
      const rep = await p5.goto(LOCAL + f); await p5.waitForTimeout(300);
      r5[a] = await p5.evaluate(() => ({
        titre: document.title, desc: (document.querySelector('meta[name="description"]') || {}).content || '',
        canon: (document.querySelector('link[rel="canonical"]') || {}).href || '', h1: document.querySelectorAll('h1').length,
        robots: (document.querySelector('meta[name="robots"]') || {}).content || '',
        tel: [...document.querySelectorAll('a[href^="tel:"]')].map(x => x.getAttribute('href')),
        mail: [...document.querySelectorAll('a[href^="mailto:"]')].map(x => x.getAttribute('href')),
        liens: [...document.querySelectorAll('main a, .contenu a, article a, a')].map(x => x.getAttribute('href')),
        texte: document.body.textContent.replace(/ | /g, ' ').replace(/\s+/g, ' '),
        deborde: document.documentElement.scrollWidth - innerWidth }));
      r5[a].statut = rep && rep.status();
    }
    const m = r5['mentions-legales/'], ct = r5['contact/'], cf = r5['confidentialite'];
    const perso = (t) => /daubertaylor22/.test(t);
    const p5ok = cf.statut === 200 && cf.canon === 'https://yadaquiz.app/confidentialite' && cf.h1 === 1 && cf.desc.length <= 155
      && cf.liens.includes('mentions-legales/') && cf.liens.includes('contact/')
      && m.statut === 200 && /^Mentions légales/.test(m.titre) && m.canon === 'https://yadaquiz.app/mentions-legales/' && m.h1 === 1 && /^index/.test(m.robots)
      && m.texte.includes('Taylor Dauber') && m.texte.includes('Boulevard de la Résistance et de la Déportation, 49100 Angers') && m.tel.length === 1 && m.tel[0] === 'tel:+33784045770'
      && m.mail.length >= 1 && m.mail.every(x => x === 'mailto:yadaquiz.app@gmail.com') && m.texte.includes('Cloudflare, Inc.') && m.texte.includes('Supabase Pte. Ltd.')
      && m.liens.includes('../confidentialite') && m.liens.includes('../contact/')
      && ct.statut === 200 && ct.canon === 'https://yadaquiz.app/contact/' && ct.h1 === 1 && ct.mail.includes('mailto:yadaquiz.app@gmail.com')
      && ct.tel.length === 0 && !/07 84 04 57 70|\+33 ?7|Boulevard de la Résistance/.test(ct.texte)
      && ![cf, m, ct].some(x => perso(x.texte) || x.deborde > 0);
    dit('5. chaque page a son adresse : la confidentialité, les mentions légales et le contact, servis à part, titrés, décrits, avec leur adresse de référence ; les mentions disent l\'éditeur, son adresse, son téléphone, l\'e-mail et les hébergeurs ; le contact ne montre ni adresse ni téléphone',
      p5ok, JSON.stringify({ cf: { s: cf.statut, c: cf.canon, d: cf.desc.length }, m: { s: m.statut, t: m.titre, c: m.canon, r: m.robots, tel: m.tel, mail: m.mail }, ct: { s: ct.statut, t: ct.titre, c: ct.canon, tel: ct.tel } }));
    await c5.close();

    /* ---------- 6. dans le jeu, l'adresse en toutes lettres ---------- */
    const c6 = await nav.newContext({ viewport: { width: 393, height: 852 }, isMobile: true, hasTouch: true, serviceWorkers: 'block' });
    await c6.route('**/supabase-js@2*', r => r.fulfill({ status: 200, contentType: 'application/javascript', body: '' }));
    await c6.route('**/pagead2.googlesyndication.com/**', r => r.abort());
    await c6.route('**/*.supabase.co/**', r => r.abort());
    await c6.addInitScript(() => {
      if (!/^http/.test(location.protocol)) return;
      localStorage.setItem('bt_profile', JSON.stringify({ name: 'Taylor', color: '#4C86E8' })); localStorage.setItem('bt_fs_hint', '1');
      window.__copies = [];
      try { Object.defineProperty(navigator, 'clipboard', { value: { writeText: (t) => { window.__copies.push(t); return Promise.resolve(); } }, configurable: true }); } catch (e) {}
    });
    const p6 = await page(c6, 'jeu local');
    await p6.goto(URL_JEU);
    await p6.waitForFunction(() => { try { return state.screen === 'mode'; } catch (e) { return false; } }, null, { timeout: 30000 });
    const r6 = {};
    for (const [nom, ouvrir, veil, attendu] of [['confidentialite', 'ouvrirConfidentialite()', 'confidentialiteVeil', 'confidentialite.html'], ['mentions', 'ouvrirMentions()', 'mentionsVeil', 'mentions-legales/']]) {
      await p6.evaluate((o) => { try { fermerFeuilleGroupe('siteVeil'); } catch (e) {} eval(o); }, ouvrir);
      await p6.waitForSelector('#' + veil + ' .page-adresse .pa-url', { timeout: 5000 });
      await p6.waitForTimeout(700);
      const vu = await p6.evaluate((v) => {
        const c = document.querySelector('#' + v + ' .page-adresse');
        const bs = [...c.querySelectorAll('button')];
        const pub = [...document.querySelectorAll('#' + v + ' .conf-l')].map(x => x.textContent.replace(/ /g, ' ')).find(x => /^La publicité/.test(x)) || null;
        return { url: c.querySelector('.pa-url').textContent, titre: c.querySelector('.gc-l').textContent, boutons: bs.map(b => b.textContent), pub };
      }, veil);
      await p6.locator('#' + veil + ' .page-adresse button', { hasText: 'Copier le lien' }).click();
      await p6.waitForTimeout(250);
      vu.copie = await p6.evaluate(() => window.__copies[window.__copies.length - 1]);
      vu.mot = await p6.evaluate(() => /Lien copié/.test(document.body.textContent));
      await p6.locator('#' + veil + ' .page-adresse button', { hasText: 'Ouvrir' }).click();
      await p6.waitForFunction(() => { const f = document.querySelector('#siteVeil .site-cadre'); try { return f && f.contentDocument && f.contentDocument.readyState === 'complete' && f.contentDocument.title; } catch (e) { return false; } }, null, { timeout: 10000 });
      vu.cadre = await p6.evaluate(() => { const f = document.querySelector('#siteVeil .site-cadre'); return { src: f.getAttribute('src'), titre: f.contentDocument.title }; });
      r6[nom] = vu;
    }
    const a6 = r6.confidentialite, b6 = r6.mentions;
    dit('6. dans le jeu, la Confidentialité et les Mentions légales écrivent leur adresse ; « Copier le lien » copie l\'adresse complète ; « Ouvrir » montre la page ; la ligne « La publicité » dit les deux endroits des annonces',
      a6.url === 'yadaquiz.app/confidentialite' && a6.copie === 'https://yadaquiz.app/confidentialite' && a6.cadre.src === 'confidentialite.html' && /^Politique de confidentialité/.test(a6.cadre.titre)
      && b6.url === 'yadaquiz.app/mentions-legales/' && b6.copie === 'https://yadaquiz.app/mentions-legales/' && b6.cadre.src === 'mentions-legales/' && /^Mentions légales/.test(b6.cadre.titre)
      && a6.mot && b6.mot && a6.titre === 'Adresse de la page' && a6.boutons.join('|') === 'Ouvrir|Copier le lien'
      && /pages à lire du site/.test(a6.pub || '') && /entre deux parties/.test(a6.pub || '') && !/jamais pendant le jeu/.test(a6.pub || ''), JSON.stringify(r6));
    await c6.close();

    /* ---------- 7. une seule adresse ---------- */
    const g7 = [];
    const c7 = await contexte(true, g7);
    const p7 = await page(c7, 'copies');
    const r7 = {};
    await p7.goto('https://daubertaylor.github.io/BibleTrivia/guide/'); await p7.waitForURL(/yadaquiz\.app/, { timeout: 5000 }).catch(() => {});
    r7.github = p7.url();
    await p7.goto('https://yada.yadaquiz-app.workers.dev/faq/?a=1#b'); await p7.waitForURL(/yadaquiz\.app/, { timeout: 5000 }).catch(() => {});
    r7.workers = p7.url();
    await p7.goto('https://daubertaylor.github.io/BibleTrivia/');
    await p7.waitForFunction(() => { try { return state.screen === 'mode'; } catch (e) { return false; } }, null, { timeout: 30000 });
    await p7.waitForTimeout(1200);
    r7.jeu = p7.url();
    await p7.evaluate(() => ouvrirSite('a-propos/', 'À propos'));
    await p7.waitForFunction(() => { const f = document.querySelector('#siteVeil .site-cadre'); try { return f && f.contentDocument && f.contentDocument.readyState === 'complete' && /a-propos/.test(f.contentWindow.location.href); } catch (e) { return false; } }, null, { timeout: 10000 }).catch(() => {});
    await p7.waitForTimeout(800);
    r7.cadre = await p7.evaluate(() => { const f = document.querySelector('#siteVeil .site-cadre'); try { return f.contentWindow.location.href; } catch (e) { return 'illisible : ' + e.message; } });
    await c7.close();
    dit('7. une seule adresse : une page du site ouverte à github.io ou à workers.dev renvoie à la même page sur yadaquiz.app ; le jeu reste à l\'ancienne adresse, et la page qu\'il montre aussi',
      r7.github === 'https://yadaquiz.app/guide/' && r7.workers === 'https://yadaquiz.app/faq/?a=1#b' && r7.jeu === 'https://daubertaylor.github.io/BibleTrivia/'
      && r7.cadre === 'https://daubertaylor.github.io/BibleTrivia/a-propos/', JSON.stringify(r7));

    /* ---------- 8. titres, descriptions, robots.txt, plan ---------- */
    const plan = fs.readFileSync(path.join(RACINE, 'sitemap.xml'), 'utf8');
    const adresses = [...plan.matchAll(/<loc>https:\/\/yadaquiz\.app\/([^<]*)<\/loc>/g)].map(x => x[1]);
    const trop = [];
    const lirePage = (rel) => {
      const f = rel === '' ? 'index.html' : rel === 'confidentialite' ? 'confidentialite.html' : rel + 'index.html';
      const s = fs.readFileSync(path.join(RACINE, f), 'utf8');
      return { titre: net(deco((s.match(/<title>([^<]*)<\/title>/) || [])[1])), desc: net(deco((s.match(/<meta name="description" content="([^"]*)"/) || [])[1])) };
    };
    for (const a of adresses.concat(['404'])) {
      const g = a === '404' ? (() => { const s = fs.readFileSync(path.join(RACINE, '404.html'), 'utf8'); return { titre: net(deco((s.match(/<title>([^<]*)<\/title>/) || [])[1])), desc: net(deco((s.match(/<meta name="description" content="([^"]*)"/) || [])[1])) }; })() : lirePage(a);
      if (!g.titre || g.titre.length > 60 || !g.desc || g.desc.length > 155) trop.push(a + ' ' + g.titre.length + '/' + g.desc.length);
    }
    const robots = fs.readFileSync(path.join(RACINE, 'robots.txt'), 'utf8');
    const fermes = ['banc-essai', 'comptes', 'groupes', 'erreurs', 'contenu', 'bibles', 'notifications'];
    /* l'ancienne page d'essai reste ouverte : Google doit y lire le renvoi et le noindex pour l'oublier */
    const r8 = { pages: adresses.length, trop: trop.slice(0, 5), fermes: fermes.filter(d => !new RegExp('^Disallow: /' + d + '/$', 'm').test(robots)), essai: /^Disallow: \/essai\//m.test(robots),
      plan: { mentions: adresses.includes('mentions-legales/'), contact: adresses.includes('contact/'), confid: adresses.includes('confidentialite'), q404: adresses.some(a => /404/.test(a)) } };
    dit('8. titres de 60 signes au plus et descriptions de 155 au plus, sur toutes les pages ; robots.txt ferme les dossiers internes, annonce le plan, n\'interdit pas tout ; le plan liste les pages légales, pas la 404',
      adresses.length >= 74 && trop.length === 0 && r8.fermes.length === 0 && !r8.essai && /^Allow: \/$/m.test(robots) && !/^Disallow: \/\s*$/m.test(robots)
      && /^Sitemap: https:\/\/yadaquiz\.app\/sitemap\.xml$/m.test(robots) && r8.plan.mentions && r8.plan.contact && r8.plan.confid && !r8.plan.q404, JSON.stringify(r8));

    /* ---------- 9. la 404 et l'ancienne page d'essai ---------- */
    const p404 = fs.readFileSync(path.join(RACINE, '404.html'), 'utf8');
    const liens404 = [...p404.matchAll(/<a [^>]*href="([^"]+)"/g)].map(x => x[1]).filter(h => !/^(mailto:|tel:|#)/.test(h));
    const essai = fs.readFileSync(path.join(RACINE, 'essai/index.html'), 'utf8');
    const r9 = { robots404: (p404.match(/<meta name="robots" content="([^"]+)"/) || [])[1], relatifs: liens404.filter(h => !/^https:\/\/yadaquiz\.app\//.test(h)).slice(0, 5),
      h1: (p404.match(/<h1[\s>]/g) || []).length, jouer: liens404.includes('https://yadaquiz.app/'),
      essai: { taille: essai.length, robots: (essai.match(/<meta name="robots" content="([^"]+)"/) || [])[1], renvoi: /location\.replace\("\.\.\/"/.test(essai), memoire: /localStorage|indexedDB|serviceWorker/.test(essai) },
      vers: r3['essai/'] && r3['essai/'].url };
    dit('9. la page 404 ramène au jeu et au site par des liens absolus, sans être indexée ; l\'ancienne page d\'essai renvoie au jeu, sans être indexée, sans rien qui tourne ni touche à la mémoire',
      /^noindex/.test(r9.robots404 || '') && r9.relatifs.length === 0 && r9.h1 === 1 && r9.jouer && liens404.length >= 4
      && r9.essai.taille < 3000 && /^noindex/.test(r9.essai.robots || '') && r9.essai.renvoi && !r9.essai.memoire && r9.vers === '/', JSON.stringify(r9));
  } catch (e) { ko++; console.log('  KO  le banc a échoué : ' + e.message); }
  dit('10. aucune erreur', !errs.length, errs.slice(0, 3).join(' | '));
  await nav.close();
  console.log(ko ? '\n  ' + ko + ' défaut(s)' : '\n  OK — le code des annonces sur les pages à lire (celui du jeu en pause pendant l\'examen), chaque page légale à son adresse, une seule adresse pour le site');
  process.exit(ko ? 1 : 0);
})();
