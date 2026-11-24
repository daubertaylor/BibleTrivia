/* ====== BANC « LA PASTILLE PART SOUS LE DOIGT, LE BLANC SOUS LE CORAIL » (v378) ======
   « Lorsque je me déplace sur la barre du bas, Accueil, Jeux et autres, en
     cliquant, ça saute un peu. »
   Filmé avant la v378, de l'Accueil aux Jeux, processeur ralenti quatre
   fois, l'horloge recalée sur le clic dans la page :
     - la pastille restait immobile pendant que l'écran des Jeux se
       dessinait (0 à 154 ms après le clic), et ne partait qu'à 265 ms,
       d'un bond de 24 px ;
     - le mot « Jeux » passait au blanc en 0,18 s, la pastille encore en
       route : blanc sur le verre crème, il disparaissait, puis revenait ;
       « Accueil » redevenait sombre sous le corail qui partait.
   Sur un iPhone, image par image :
     1. la rangée blanche de la pastille tombe sur celle de la barre, à
        0,3 px près, pour chaque onglet (icône, mot, pastille des non-lus),
        sur trois écrans et dans les trois langues ;
     2. les mots de la barre ne changent jamais de couleur : sombres dans la
        barre, blancs dans la pastille, à chaque image d'une glissade ;
     3. un vrai toucher : la pastille bouge à l'écran avant la fin du dessin
        de l'écran suivant, et elle glisse PENDANT ce dessin (au moins trois
        images en route) — puis l'écran des Jeux est bien là ;
     4. deux touchers coup sur coup (Jeux puis Groupes) : un seul départ,
        vers le second ;
     5. au repos, la pastille n'a pas de couche à elle, et rien n'est
        resté en route (ongletVise vide) ;
     6. aucune erreur.
   Usage : node banc-essai/barre-glisse.js [url] */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const URL = process.env.URL_ESSAI || process.argv[2] || 'http://127.0.0.1:8099/index.html';
const IOS = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1';
let ko = 0;
const dit = (quoi, bon, detail) => { console.log('  ' + (bon ? 'OK  ' : 'KO  ') + quoi + (detail ? '  (' + String(detail).slice(0, 420) + ')' : '')); if (!bon) ko++; };

async function page(nav, w, h, dpr) {
  const ctx = await nav.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: dpr, isMobile: true, hasTouch: true, userAgent: IOS, serviceWorkers: 'block' });
  await ctx.route('**/pagead2.googlesyndication.com/**', r => r.abort());
  await ctx.route('**/supabase-js@2*', r => r.fulfill({ status: 200, contentType: 'application/javascript', body: '' }));
  await ctx.route('**/*.supabase.co/**', r => r.abort());
  await ctx.addInitScript(() => {
    localStorage.setItem('bt_profile', JSON.stringify({ name: 'Taylor', color: '#4C86E8' }));
    localStorage.setItem('bt_fs_hint', '1');
    localStorage.setItem('bt_settings', JSON.stringify({ sfx: false, music: false }));
  });
  const p = await ctx.newPage();
  p.__erreurs = [];
  p.on('pageerror', e => p.__erreurs.push(e.message));
  await p.goto(URL);
  await p.waitForFunction(() => { try { return state.screen === 'mode' && document.getElementById('barreBas') && !document.getElementById('barreBas').classList.contains('cachee'); } catch (e) { return false; } }, null, { timeout: 30000 });
  await p.waitForTimeout(900);
  return { ctx, p };
}

(async () => {
  const nav = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const erreurs = [];
  try {
    /* ---- 1 ---- la rangée blanche sur la rangée de la barre */
    let pire = 0, ou = '';
    for (const [w, h, dpr] of [[393, 852, 3], [375, 667, 2], [320, 568, 2]]) {
      const { ctx, p } = await page(nav, w, h, dpr);
      for (const langue of ['fr', 'en', 'es']) {
        const r = await p.evaluate(async (langue) => {
          if (LANGUE !== langue) setLangue(langue);
          grp.nonLus = 7; majBarre();
          const b = document.getElementById('barreBas'); const l = [];
          for (const o of ['accueil', 'parcours', 'jeux', 'groupes']) {
            b.classList.add('pose-nette'); poserPastille(b, o); void b.offsetWidth; b.classList.remove('pose-nette');
            await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
            for (const sel of ['.bb-ico', '.bb-mot', '.bb-pastille']) {
              const a = b.querySelector(`.bb-onglet[data-o="${o}"] ${sel}`), c = b.querySelector(`.bb-cel[data-o="${o}"] ${sel}`);
              if (!a || a.hidden) continue;
              if (!c) { l.push([o + sel + ' sans copie', 99]); continue; }
              const ra = a.getBoundingClientRect(), rc = c.getBoundingClientRect();
              l.push([o + sel, Math.max(Math.abs(rc.left - ra.left), Math.abs(rc.top - ra.top), Math.abs(rc.width - ra.width), Math.abs(rc.height - ra.height))]);
            }
          }
          grp.nonLus = 0; majBarre();
          return l;
        }, langue);
        for (const x of r) if (x[1] > pire) { pire = x[1]; ou = `${w}x${h} ${langue} ${x[0]}`; }
      }
      erreurs.push(...p.__erreurs);
      await ctx.close();
    }
    dit('1. la rangée blanche tombe sur la rangée de la barre (3 écrans, 3 langues, non-lus compris)', pire <= 0.3, 'écart max ' + pire.toFixed(2) + ' px' + (ou ? ', ' + ou : ''));

    const { ctx, p } = await page(nav, 393, 852, 1);
    /* ---- 2 ---- les couleurs pendant une glissade */
    const couleurs = await p.evaluate(() => new Promise(res => {
      const b = document.getElementById('barreBas'); const vus = new Set(); const t0 = performance.now();
      const tic = () => {
        b.querySelectorAll('.bb-onglet .bb-mot').forEach(m => vus.add('barre ' + getComputedStyle(m).color));
        b.querySelectorAll('.bb-cel .bb-mot').forEach(m => vus.add('pastille ' + getComputedStyle(m).color));
        if (performance.now() - t0 < 900) requestAnimationFrame(tic); else res([...vus]);
      };
      requestAnimationFrame(tic);
      toucherOnglet('groupes');
    }));
    const barre = couleurs.filter(c => c.startsWith('barre')), past = couleurs.filter(c => c.startsWith('pastille'));
    dit('2. les mots ne changent jamais de couleur : sombres dans la barre, blancs dans la pastille', barre.length === 1 && past.length === 1 && past[0] === 'pastille rgb(255, 255, 255)' && !/255, 255, 255/.test(barre[0]), couleurs.join(' | '));
    await p.waitForFunction(() => state.screen === 'groupes' && !passage, null, { timeout: 6000 });
    await p.evaluate(() => allerOnglet('accueil'));
    await p.waitForFunction(() => state.screen === 'mode' && !passage, null, { timeout: 6000 });
    await p.waitForTimeout(700);

    /* ---- 3 ---- un vrai toucher, processeur ralenti */
    await p.evaluate(() => { window.__m = {};
      document.addEventListener('click', () => { if (!window.__m.clic) window.__m.clic = performance.timeOrigin + performance.now(); }, { capture: true });
      const va = window.allerOnglet; window.allerOnglet = function () { if (!window.__m.r0) window.__m.r0 = performance.timeOrigin + performance.now(); const r = va.apply(this, arguments); if (!window.__m.r1) window.__m.r1 = performance.timeOrigin + performance.now(); return r; }; });
    const bt = await p.locator('#barreBas .bb-onglet[data-o="jeux"]').boundingBox();
    const bb = await p.locator('#barreBas').boundingBox();
    const cdp = await ctx.newCDPSession(p);
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
    const images = [];
    cdp.on('Page.screencastFrame', async (f) => { images.push({ t: f.metadata.timestamp * 1000, d: f.data }); try { await cdp.send('Page.screencastFrameAck', { sessionId: f.sessionId }); } catch (e) {} });
    await cdp.send('Page.startScreencast', { format: 'png', everyNthFrame: 1, maxWidth: 393, maxHeight: 852 });
    await p.waitForTimeout(400);
    await p.touchscreen.tap(bt.x + bt.width / 2, bt.y + bt.height / 2);
    await p.waitForTimeout(1600);
    await cdp.send('Page.stopScreencast');
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
    const m = await p.evaluate(() => window.__m);
    const xs = await p.evaluate(async ([imgs, bb, clic]) => { const out = [];
      for (const im of imgs) { const ms = Math.round(im.t - clic); if (ms < -60) continue;
        const img = new Image(); img.src = 'data:image/png;base64,' + im.d; await img.decode();
        const c = document.createElement('canvas'); c.width = img.width; c.height = img.height; const g = c.getContext('2d'); g.drawImage(img, 0, 0);
        const k = c.width / 393; const y = Math.round((bb.y + 8) * k); const d = g.getImageData(0, y, c.width, 1).data; let gauche = -1;
        for (let x = 0; x < c.width; x++) { const r = d[x * 4], v = d[x * 4 + 1], b = d[x * 4 + 2]; if (r > 210 && v < 110 && b < 90) { gauche = x; break; } }
        out.push([ms, Math.round(gauche / k)]); }
      return out.sort((a, b) => a[0] - b[0]); }, [images, bb, m.clic]);
    const x0 = xs.length ? xs[0][1] : 0;
    const premier = xs.find(x => x[1] > x0 + 2);
    const r0 = Math.round(m.r0 - m.clic), r1 = Math.round(m.r1 - m.clic);
    const enRoute = xs.filter(x => x[0] > r0 && x[0] < r1 && x[1] > x0 + 2).length;
    const ecran = await p.evaluate(() => state.screen);
    dit('3. vrai toucher : la pastille bouge avant la fin du dessin de l\'écran suivant, et glisse pendant', !!premier && premier[0] < r1 && enRoute >= 3 && ecran === 'jeux',
      `dessin de ${r0} à ${r1} ms après le clic ; premier mouvement à ${premier ? premier[0] : '—'} ms ; ${enRoute} image(s) en route pendant le dessin ; écran ${ecran}`);
    await p.waitForFunction(() => !passage, null, { timeout: 6000 });
    await p.waitForTimeout(600);

    /* ---- 4 ---- deux touchers coup sur coup */
    const r4 = await p.evaluate(() => new Promise(res => {
      const ecrans = []; const va = window.allerOnglet;
      window.allerOnglet = function (o) { ecrans.push(o); return va.apply(this, arguments); };
      toucherOnglet('accueil'); toucherOnglet('groupes');
      setTimeout(() => { window.allerOnglet = va; res({ ecrans, ecran: state.screen, o: document.getElementById('barreBas').dataset.o }); }, 1400);
    }));
    dit('4. deux touchers coup sur coup : un seul départ, vers le second', r4.ecrans.join(',') === 'groupes' && r4.ecran === 'groupes' && r4.o === 'groupes', JSON.stringify(r4));
    await p.waitForTimeout(600);

    /* ---- 5 ---- au repos */
    const r5 = await p.evaluate(() => { const c = document.querySelector('#barreBas .bb-curseur'), bl = document.querySelector('#barreBas .bb-blanc');
      const t = (el) => getComputedStyle(el).transform; const cs = (el) => getComputedStyle(el);
      return { vise: ongletVise, wc: cs(c).willChange + '/' + cs(bl).willChange, t3d: /matrix3d/.test(t(c)) || /matrix3d/.test(t(bl)), anims: c.getAnimations().length + bl.getAnimations().length }; });
    dit('5. au repos : pas de couche à soi, plus rien en route', r5.vise === null && !r5.t3d && r5.anims === 0 && !/transform/.test(r5.wc), JSON.stringify(r5));
    erreurs.push(...p.__erreurs);
    await ctx.close();
  } catch (e) {
    dit('le banc a planté', false, e.stack || e.message);
  }
  dit('6. aucune erreur', erreurs.length === 0, erreurs.join(' | '));
  await nav.close();
  console.log(ko ? `\n${ko} échec(s)` : '\nTout est vert.');
  process.exit(ko ? 1 : 0);
})();
