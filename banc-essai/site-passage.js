/* ====== BANC « LE SITE PASSE D'UNE PAGE À L'AUTRE SANS COUPURE » (v372) ======
   « Pour ce qui est de ces pages-ci, j'aime énormément. Juste vérifie les
     animations au niveau du changement de page, parce que là, il est
     vraiment pas top. »
   Filmé avant la v372, de « Quiz par livre » à « Guide » : la page changeait
   d'un coup ; pendant 120 ms le haut de la page était un aplat brun (le
   décor pas encore peint), le titre s'écrivait dans une police de secours
   puis sautait dans la sienne, et la rangée des rubriques revenait au début.
   Sur un téléphone (Chrome, qui fait les transitions entre pages comme
   Safari 18.2 et plus) :
     1. le passage est une transition du navigateur (la page qui arrive le
        dit : pagereveal, avec sa transition) ;
     2. image par image pendant le passage : le haut de la page n'est jamais
        un aplat (le décor, ou sa miniature, est toujours là) et ne pâlit
        jamais (pas de fond crème à travers la photo) ;
     3. la police du titre est prête dès la première image de la page qui
        arrive ;
     4. la rangée des rubriques garde sa place d'une page à l'autre, et
        l'onglet de la page où l'on arrive y est entier ;
     5. aucune erreur.
   Usage : node banc-essai/site-passage.js [url du jeu] */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const URL = process.argv[2] || 'http://127.0.0.1:8099/index.html';
const BASE = URL.replace(/\/[^/]*$/, '');
let ko = 0;
const dit = (quoi, bon, detail) => { console.log('  ' + (bon ? 'OK  ' : 'KO  ') + quoi + (detail ? '  (' + String(detail).slice(0, 400) + ')' : '')); if (!bon) ko++; };

(async () => {
  const nav = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const erreurs = [];
  try {
    const ctx = await nav.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true,
      userAgent: 'Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36' });
    await ctx.route('**/pagead2.googlesyndication.com/**', r => r.abort());
    /* Chaque page qui arrive note si elle est venue par une transition, et si
       la police du titre était prête à sa première image. */
    await ctx.addInitScript(() => {
      addEventListener('pagereveal', (e) => { try { sessionStorage.setItem('banc-vt', e.viewTransition ? 'oui' : 'non'); } catch (x) {} });
      requestAnimationFrame(() => { try {
        const p = [...document.fonts].filter(f => /Poppins/.test(f.family) && String(f.weight) === '700');
        sessionStorage.setItem('banc-police', p.some(f => f.status === 'loaded') ? 'prête' : (p.map(f => f.status).join(',') || 'aucune'));
      } catch (x) {} });
    });
    const p = await ctx.newPage();
    p.on('pageerror', e => erreurs.push(e.message));
    await p.goto(BASE + '/quiz-biblique/', { waitUntil: 'load' });
    await p.waitForTimeout(700);

    /* Le haut de la page, image par image, pendant le passage. */
    const cdp = await ctx.newCDPSession(p);
    const images = [];
    cdp.on('Page.screencastFrame', async (f) => { images.push(f.data); try { await cdp.send('Page.screencastFrameAck', { sessionId: f.sessionId }); } catch (e) {} });
    await cdp.send('Page.startScreencast', { format: 'png', everyNthFrame: 1 });
    await p.waitForTimeout(120);
    await p.evaluate(() => [...document.querySelectorAll('.menu-mobile a')].find(a => /Guide/.test(a.textContent)).click());
    await p.waitForURL(/\/guide\//, { timeout: 8000 });
    await p.waitForTimeout(900);
    await cdp.send('Page.stopScreencast');
    const mesures = await p.evaluate(async (imgs) => {
      const res = [];
      for (const d of imgs) {
        const im = new Image(); im.src = 'data:image/png;base64,' + d; await im.decode();
        const c = document.createElement('canvas'); c.width = im.width; c.height = im.height;
        const g = c.getContext('2d'); g.drawImage(im, 0, 0);
        /* une bande du décor, sous l'en-tête, à droite du titre */
        const y0 = Math.round(im.height * 0.16), h = Math.round(im.height * 0.05);
        const px = g.getImageData(Math.round(im.width * 0.55), y0, Math.round(im.width * 0.4), h).data;
        let s = 0, s2 = 0, n = 0;
        for (let i = 0; i < px.length; i += 4) { const l = 0.2126 * px[i] + 0.7152 * px[i + 1] + 0.0722 * px[i + 2]; s += l; s2 += l * l; n++; }
        const m = s / n; res.push({ m: Math.round(m), e: Math.round(Math.sqrt(Math.max(0, s2 / n - m * m))) });
      }
      return res;
    }, images);
    const apres = mesures.slice(1);
    const plat = apres.filter(x => x.e < 6).length;
    const lum = apres.map(x => x.m), lo = Math.min(lum[0], lum[lum.length - 1]), hi = Math.max(lum[0], lum[lum.length - 1]);
    const pale = apres.filter(x => x.m > hi + 18).length;
    const vt = await p.evaluate(() => sessionStorage.getItem('banc-vt'));
    const police = await p.evaluate(() => sessionStorage.getItem('banc-police'));
    dit('1. le passage de « Quiz par livre » à « Guide » est une transition du navigateur', vt === 'oui', vt);
    dit('2. image par image, le haut de la page n\'est jamais un aplat, et ne pâlit jamais', images.length > 8 && plat === 0 && pale === 0,
      JSON.stringify({ images: images.length, plat, pale, lum: lum.join(' '), ecart: apres.map(x => x.e).join(' ') }));
    dit('3. la police du titre est prête dès la première image de la page qui arrive', police === 'prête', police);

    /* 4. la rangée des rubriques : elle garde sa place, et l'onglet actif est entier */
    await p.evaluate(() => { const m = document.querySelector('.menu-mobile'); m.scrollLeft = 70; });
    await p.waitForTimeout(100);
    const avant = await p.evaluate(() => document.querySelector('.menu-mobile').scrollLeft);
    await p.evaluate(() => [...document.querySelectorAll('.menu-mobile a')].find(a => /Nouveautés/.test(a.textContent)).click());
    await p.waitForURL(/\/nouveautes\//, { timeout: 8000 });
    await p.waitForTimeout(700);
    const garde = await p.evaluate(() => document.querySelector('.menu-mobile').scrollLeft);
    await p.evaluate(() => { document.querySelector('.menu-mobile').scrollLeft = 0; });
    await p.evaluate(() => [...document.querySelectorAll('.menu-mobile a')].find(a => /propos/.test(a.textContent)).click());
    await p.waitForURL(/\/a-propos\//, { timeout: 8000 });
    await p.waitForTimeout(700);
    const actif = await p.evaluate(() => { const m = document.querySelector('.menu-mobile'), a = m.querySelector('[aria-current]');
      const r = a.getBoundingClientRect(), n = m.getBoundingClientRect(); return { g: Math.round(r.left - n.left), d: Math.round(n.right - r.right), x: m.scrollLeft }; });
    dit('4. la rangée des rubriques garde sa place d\'une page à l\'autre, et l\'onglet de la page où l\'on arrive y est entier',
      Math.abs(garde - avant) <= 2 && actif.g >= 0 && actif.d >= 0, JSON.stringify({ avant, garde, actif }));
    await ctx.close();
  } catch (e) {
    dit('le banc s\'est arrêté', false, (e.stack || e).toString().slice(0, 500));
  } finally {
    dit('5. aucune erreur', erreurs.length === 0, erreurs.slice(0, 3).join(' | '));
    await nav.close().catch(() => {});
  }
  console.log(ko ? '\n  ' + ko + ' KO' : '\n  OK — le site passe d\'une page à l\'autre sans coupure');
  process.exit(ko ? 1 : 0);
})();
