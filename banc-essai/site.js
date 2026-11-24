/* ====== LE SITE DE YADA (v363) ======
   « Google AdSense m'a encore refusé : contenu de faible valeur. »
   Le jeu ne montre presque aucun texte à qui le lit sans jouer. Le site,
   généré par contenu/genere.py, donne à lire ce que le jeu contient. Ce banc
   vérifie qu'il dit vrai, qu'il est entier, et qu'il se tient :
     1. la page du jeu se présente : description, adresse de référence,
        image de partage, données structurées lisibles, et les liens vers le
        site écrits dans la page elle-même (un robot les lit sans rien
        exécuter) ; le verrou paysage ne sert jamais d'extrait ;
     2. CHAQUE question du jeu est sur le site, une seule fois, avec sa bonne
        réponse et son explication telles que le jeu les donne — et rien
        d'autre (si la banque change sans que le site soit régénéré, ce banc
        le dit) ; 66 pages de livres, chacune avec ses questions ;
     3. chaque page : servie, titrée, décrite, une adresse de référence en
        yadaquiz.app, un seul titre h1, en français — (v367) à la française :
        aucune espace ordinaire devant « : ; ? ! » », après « « », ni dans un
        nombre (1 796) — ; aucun lien mort (tous
        les liens internes mènent à un fichier du dépôt) ; le plan du site
        (sitemap.xml) les liste toutes, et robots.txt l'annonce ;
     4. on joue sur une page : toucher la bonne réponse l'allume en vert,
        une mauvaise en rose, l'explication s'ouvre, le score se tient ;
     5. sur un téléphone, rien ne dépasse en largeur ; aucune bordure nulle
        part (« jamais de bordures ») ; les polices du jeu ;
     6. sur un grand écran, les liens du site sont visibles à l'accueil du
        jeu, hors du jeu ; sur un téléphone, ils ne prennent aucune place, et
        « À propos » est dans les Réglages ;
     7. aucune erreur.
   Usage : node banc-essai/site.js [url du jeu] */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const fs = require('fs'), path = require('path');
const URL_JEU = process.argv[2] || 'http://127.0.0.1:8099/index.html';
const BASE = new URL('./', URL_JEU).href;
const RACINE = path.resolve(__dirname, '..');
let ko = 0;
const dit = (q, b, d) => { if (!b) ko++; console.log('  ' + (b ? 'OK  ' : 'KO  ') + q + (d ? '   (' + String(d).slice(0, 500) + ')' : '')); };
const net = (t) => String(t || '').replace(/[  ]/g, ' ').replace(/\s+/g, ' ').trim();
/* Un lien interne mène-t-il à un fichier ? (Cloudflare sert /x pour x.html, et /d/ pour d/index.html) */
function existe(rel){
  rel = decodeURIComponent(rel.split('#')[0].split('?')[0]);
  if (rel === '' || rel.endsWith('/')) return fs.existsSync(path.join(RACINE, rel, 'index.html'));
  const p = path.join(RACINE, rel);
  return fs.existsSync(p) || fs.existsSync(p + '.html');
}

(async () => {
  const nav = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const errs = [];
  try {
    /* ---------- 1. la page du jeu, telle que la lit un robot ---------- */
    const brut = fs.readFileSync(path.join(RACINE, 'index.html'), 'utf8');
    const tete = brut.slice(0, brut.indexOf('</head>'));
    const desc = (tete.match(/<meta name="description" content="([^"]+)"/) || [])[1] || '';
    const canon = (tete.match(/<link rel="canonical" href="([^"]+)"/) || [])[1];
    const ogi = (tete.match(/<meta property="og:image" content="([^"]+)"/) || [])[1] || '';
    let ld = null; try { ld = JSON.parse((tete.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/) || [])[1]); } catch (e) {}
    const liensBruts = ((brut.match(/<nav id="liens-site"[^>]*>([\s\S]*?)<\/nav>/) || [])[1] || '').match(/href="([^"]+)"/g) || [];
    const rl = /<div id="rotate-lock" data-nosnippet>/.test(brut);
    dit('1. la page du jeu se présente : description, adresse de référence, image de partage, données structurées, liens du site écrits dans la page, verrou paysage hors des extraits',
      desc.length >= 110 && desc.length <= 260 && /quiz biblique/i.test(desc) && canon === 'https://yadaquiz.app/' && ogi === 'https://yadaquiz.app/site/partage.jpg'
      && fs.existsSync(path.join(RACINE, 'site/partage.jpg')) && Array.isArray(ld) && ld.some(x => x['@type'] === 'WebApplication') && liensBruts.length >= 5
      && liensBruts.every(h => existe(h.slice(6, -1))) && rl,
      JSON.stringify({ desc: desc.length, canon, ogi, ld: ld && ld.map(x => x['@type']), liens: liensBruts, rl }));

    /* ---------- 2. la banque du jeu, toute la banque, rien que la banque ---------- */
    const ctx = await nav.newContext({ viewport: { width: 375, height: 812 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true, serviceWorkers: 'block' });
    const p = await ctx.newPage();
    p.on('pageerror', e => errs.push('page : ' + e.message));
    p.on('console', m => { if (m.type() === 'error' && !/favicon|ERR_FAILED|net::/.test(m.text())) errs.push('console : ' + m.text()); });
    await p.route('**/supabase-js@2*', r => r.fulfill({ status: 200, contentType: 'application/javascript', body: '' }));
    await p.route('**/pagead2.googlesyndication.com/**', r => r.abort());
    await p.addInitScript(() => { localStorage.setItem('bt_profile', JSON.stringify({ name: 'Banc', color: '#4C86E8' })); localStorage.setItem('bt_fs_hint', '1'); });
    await p.goto(URL_JEU);
    await p.waitForFunction(() => { try { return typeof BANK === 'object' && typeof bookOf === 'function' && state.screen === 'mode'; } catch (e) { return false; } }, null, { timeout: 30000 });
    const banque = await p.evaluate(() => {
      const out = [];
      for (const t of ['facile', 'moyen', 'difficile']) BANK[t].forEach(q => out.push({ q: q.q, c: q.correct, f: q.fact, l: bookOf(q) }));
      return { out, livres: BIBLE_BOOKS.slice() };
    });
    const plan = fs.readFileSync(path.join(RACINE, 'sitemap.xml'), 'utf8');
    const adresses = [...plan.matchAll(/<loc>https:\/\/yadaquiz\.app\/([^<]*)<\/loc>/g)].map(m => m[1]);
    const pagesLivres = adresses.filter(a => /^quiz-biblique\/[^/]+\/$/.test(a));
    const vues = new Map(); let maladroites = [];
    const lirePage = async (rel) => p.evaluate(async (u) => {
      const r = await fetch(u); const t = await r.text();
      const d = new DOMParser().parseFromString(t, 'text/html');
      const qs = [...d.querySelectorAll('.q[data-b]')].map(a => {
        const opts = [...a.querySelectorAll('.q-options li')].map(li => li.textContent.replace(/^[A-D]/, ''));
        return { q: a.querySelector('h3').textContent, bonne: opts[+a.getAttribute('data-b')], rep: (a.querySelector('.bonne span') || {}).textContent,
          f: [...a.querySelectorAll('.savais p')].pop().textContent, n: opts.length };
      });
      return { statut: r.status, qs, titre: d.title, desc: (d.querySelector('meta[name="description"]') || {}).content || '',
        canon: (d.querySelector('link[rel="canonical"]') || {}).href || '', h1: d.querySelectorAll('h1').length, lang: d.documentElement.lang,
        liens: [...d.querySelectorAll('a[href]')].map(a => a.getAttribute('href')),
        typo: (() => { const w = d.createTreeWalker(d.body, NodeFilter.SHOW_TEXT), f = [];
          for (let n = w.nextNode(); n; n = w.nextNode()) { const p = n.parentElement;
            if (!p || /^(SCRIPT|STYLE)$/.test(p.tagName)) continue;
            const m = n.nodeValue.match(/[^\s] [:;?!»]|« [^\s]|\d \d{3}(?!\d)/); if (m) f.push(m[0]); }
          return f; })() };
    }, BASE + rel);
    const pages = {};
    for (const a of adresses) {
      if (a === '' || a === 'confidentialite') continue;
      pages[a] = await lirePage(a);
      for (const q of pages[a].qs) {
        const k = net(q.q);
        vues.set(k, (vues.get(k) || 0) + 1);
        if (q.n !== 4 || net(q.bonne) !== net(q.rep)) maladroites.push(k);
      }
    }
    const parTexte = new Map(banque.out.map(q => [net(q.q), q]));
    const absentes = banque.out.filter(q => !vues.has(net(q.q))).map(q => q.q);
    const doubles = [...vues].filter(([, n]) => n > 1).map(([k]) => k);
    const etrangeres = [...vues.keys()].filter(k => !parTexte.has(k));
    const fausses = [];
    for (const a in pages) for (const q of pages[a].qs) {
      const b = parTexte.get(net(q.q)); if (!b) continue;
      if (net(q.bonne) !== net(b.c) || net(q.f) !== net(b.f)) fausses.push(q.q);
      const slug = (a.match(/^quiz-biblique\/([^/]+)\/$/) || [])[1];
      if (slug && b.l === null) fausses.push('sans livre sur une page de livre : ' + q.q);
    }
    const livresVides = pagesLivres.filter(a => !pages[a] || pages[a].qs.length === 0);
    dit('2. chaque question du jeu est sur le site, une seule fois, avec sa bonne réponse et son explication — et rien d\'autre ; 66 pages de livres, aucune vide',
      banque.out.length > 1500 && absentes.length === 0 && doubles.length === 0 && etrangeres.length === 0 && fausses.length === 0 && maladroites.length === 0
      && pagesLivres.length === 66 && livresVides.length === 0,
      JSON.stringify({ banque: banque.out.length, vues: vues.size, absentes: absentes.slice(0, 3), doubles: doubles.slice(0, 3), etrangeres: etrangeres.slice(0, 3), fausses: fausses.slice(0, 3), maladroites: maladroites.slice(0, 3), pagesLivres: pagesLivres.length, livresVides }));

    /* ---------- 3. chaque page se tient ; aucun lien mort ; le plan et robots.txt ---------- */
    const malTenues = [], morts = new Set();
    for (const a in pages) {
      const g = pages[a];
      if (g.typo.length) malTenues.push(a + ' typographie : ' + JSON.stringify(g.typo.slice(0, 3)) + ' (' + g.typo.length + ')');
      if (g.statut !== 200 || g.titre.length < 15 || g.desc.length < 70 || g.canon !== 'https://yadaquiz.app/' + a || g.h1 !== 1 || g.lang !== 'fr') malTenues.push(a + ' ' + JSON.stringify({ s: g.statut, t: g.titre.length, d: g.desc.length, c: g.canon, h1: g.h1, l: g.lang }));
      for (const h of g.liens) {
        if (/^(https?:|mailto:|tel:|#)/.test(h)) continue;
        const rel = path.posix.normalize(path.posix.join(a, h));
        if (!existe(rel.startsWith('./') ? rel.slice(2) : (rel === '.' ? '' : rel))) morts.add(a + ' → ' + h);
      }
    }
    const robots = fs.readFileSync(path.join(RACINE, 'robots.txt'), 'utf8');
    const attendues = ['', 'quiz-biblique/', 'guide/', 'a-propos/', 'faq/', 'nouveautes/', 'confidentialite'];
    dit('3. chaque page : servie, titrée, décrite, son adresse de référence en yadaquiz.app, un seul h1, en français, à la française ; aucun lien mort ; le plan les liste toutes, robots.txt l\'annonce',
      malTenues.length === 0 && morts.size === 0 && attendues.every(x => adresses.includes(x)) && adresses.length >= 72
      && /^Sitemap: https:\/\/yadaquiz\.app\/sitemap\.xml$/m.test(robots) && !/^Disallow: \/\s*$/m.test(robots),
      JSON.stringify({ malTenues: malTenues.slice(0, 3), morts: [...morts].slice(0, 5), adresses: adresses.length }));

    /* ---------- 4 et 5. on joue sur une page ; elle tient dans un téléphone ---------- */
    await p.goto(BASE + 'quiz-biblique/genese/'); await p.waitForTimeout(500);
    const jeu = await p.evaluate(async () => {
      await document.fonts.ready;
      const qs = [...document.querySelectorAll('.q[data-b]')];
      const a = qs[0], b = qs[1];
      const ba = +a.getAttribute('data-b'), bb = +b.getAttribute('data-b');
      a.querySelectorAll('.q-options li')[ba].click();
      b.querySelectorAll('.q-options li')[(bb + 1) % 4].click();
      b.querySelectorAll('.q-options li')[bb].click();          // un second toucher ne change rien
      await new Promise(r => setTimeout(r, 450));               // la couleur arrive en fondu
      await document.fonts.ready;
      const fond = (el) => getComputedStyle(el).backgroundColor;
      const s = document.querySelector('.score');
      return { aOk: a.querySelectorAll('.q-options li')[ba].classList.contains('ok'), aOuvert: a.querySelector('.q-rep').open,
        bKo: b.querySelectorAll('.q-options li')[(bb + 1) % 4].classList.contains('ko'), bBonne: b.querySelectorAll('.q-options li')[bb].classList.contains('ok'),
        vert: fond(a.querySelectorAll('.q-options li')[ba]), rose: fond(b.querySelectorAll('.q-options li')[(bb + 1) % 4]),
        score: s && !s.hidden ? s.textContent.replace(/\s+/g, ' ') : null,
        deborde: document.documentElement.scrollWidth - innerWidth,
        polices: [...document.fonts].filter(f => f.status === 'loaded').map(f => f.family) };
    });
    dit('4. on joue sur une page : la bonne réponse s\'allume en vert, la mauvaise en rose, l\'explication s\'ouvre, le score se tient (1 sur 2)',
      jeu.aOk && jeu.aOuvert && jeu.bKo && jeu.bBonne && jeu.vert === 'rgb(198, 242, 216)' && jeu.rose === 'rgb(255, 220, 213)' && /1 \/ 2/.test(jeu.score || ''),
      JSON.stringify(jeu));
    const tenue = [];
    for (const a of ['quiz-biblique/', 'quiz-biblique/genese/', 'quiz-biblique/2-jean/', 'guide/', 'a-propos/', 'faq/', 'nouveautes/']) {
      await p.goto(BASE + a); await p.waitForTimeout(250);
      const r = await p.evaluate(() => {
        let bords = [];
        for (const el of document.querySelectorAll('body *')) {
          const c = getComputedStyle(el);
          for (const cote of ['Top', 'Right', 'Bottom', 'Left'])
            if (parseFloat(c['border' + cote + 'Width']) > 0 && c['border' + cote + 'Style'] !== 'none' && c['border' + cote + 'Style'] !== 'hidden') { bords.push(el.tagName + '.' + el.className); break; }
        }
        return { deborde: document.documentElement.scrollWidth - innerWidth, bords: bords.slice(0, 3) };
      });
      if (r.deborde > 0 || r.bords.length) tenue.push(a + ' ' + JSON.stringify(r));
    }
    dit('5. sur un téléphone, rien ne dépasse en largeur ; aucune bordure nulle part ; les polices du jeu',
      tenue.length === 0 && jeu.deborde <= 0 && ['Inter', 'Poppins', 'Fraunces'].every(f => jeu.polices.includes(f)), JSON.stringify({ tenue, polices: jeu.polices }));

    /* ---------- 6. les liens du site, depuis le jeu ---------- */
    await p.goto(URL_JEU);
    await p.waitForFunction(() => { try { return state.screen === 'mode'; } catch (e) { return false; } }, null, { timeout: 30000 });
    await p.waitForTimeout(600);
    const tel = await p.evaluate(() => {
      const n = document.getElementById('liens-site');
      const vis = n && getComputedStyle(n).display !== 'none';
      openSettings();
      /* (v378) « À propos » s'ouvre DANS le jeu (voir LE SITE S'OUVRE DANS
         LE JEU) : un bouton, plus un lien vers une autre fenêtre. */
      const a = [...document.querySelectorAll('#settingsVeil .liens-legaux .lien-conf')].find(b => /ouvrirSite\('a-propos\/'\)/.test(b.getAttribute('onclick') || ''));
      return { vis, apropos: !!a && a.tagName === 'BUTTON', texte: a && a.textContent };
    });
    await ctx.close();
    const big = await nav.newContext({ viewport: { width: 1366, height: 860 }, deviceScaleFactor: 1, serviceWorkers: 'block' });
    const q = await big.newPage();
    q.on('pageerror', e => errs.push('bureau : ' + e.message));
    await q.route('**/supabase-js@2*', r => r.fulfill({ status: 200, contentType: 'application/javascript', body: '' }));
    await q.route('**/pagead2.googlesyndication.com/**', r => r.abort());
    await q.addInitScript(() => { localStorage.setItem('bt_profile', JSON.stringify({ name: 'Banc', color: '#4C86E8' })); localStorage.setItem('bt_fs_hint', '1'); });
    await q.goto(URL_JEU);
    await q.waitForFunction(() => { try { return state.screen === 'mode'; } catch (e) { return false; } }, null, { timeout: 30000 });
    await q.waitForTimeout(800);
    const bureau = await q.evaluate(() => {
      const n = document.getElementById('liens-site'), app = document.getElementById('app').getBoundingClientRect();
      const r = n.getBoundingClientRect();
      const accueil = getComputedStyle(n).display !== 'none' && r.width > 0;
      const dehors = r.right <= app.left || r.left >= app.right;
      return { accueil, dehors, n: n.querySelectorAll('a').length };
    });
    await q.click('text=Mode Solo'); await q.waitForTimeout(700);
    await q.click('text=Commencer la partie'); await q.waitForTimeout(1200);
    const pendant = await q.evaluate(() => getComputedStyle(document.getElementById('liens-site')).display);
    await big.close();
    dit('6. sur un grand écran, les liens du site se voient à l\'accueil, hors du jeu, et s\'effacent en partie ; sur un téléphone, ils ne prennent aucune place et « À propos » est dans les Réglages',
      bureau.accueil && bureau.dehors && bureau.n >= 5 && pendant === 'none' && !tel.vis && tel.apropos, JSON.stringify({ bureau, pendant, tel }));
  } catch (e) { errs.push('banc : ' + e.message); }
  dit('7. aucune erreur', errs.length === 0, errs.slice(0, 4).join(' | '));
  await nav.close();
  console.log(ko ? '\n  ' + ko + ' KO' : '\n  OK — le site dit ce que contient le jeu, entier, et il se tient');
  process.exit(ko ? 1 : 0);
})();
