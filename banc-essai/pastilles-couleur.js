/* ====== BANC « TOUCHER UNE COULEUR, C'EST LE MÊME GESTE PARTOUT » (v333) ======
   « Vérifie que l'animation, lorsque je clique sur les couleurs, que ce soit
     dans le profil ou dans le mode groupe, soit exactement pareille au niveau
     de l'animation, pour qu'il y ait une cohérence à 100 %. » Sur iPhone et
   sur Android, la rangée du Profil et celle d'un groupe (créer, modifier) :
     1. au repos, la même pastille : même bouton, même disque (quittée et
        retenue), même ombre, même coche, même voile d'appui (sa teinte, sa
        forme, sa taille autour du disque) ;
     2. sous le doigt (« :active », posé par l'outil de développement), le
        même enfoncement ;
     3. un tapotement sur la troisième couleur, filmé image par image
        pendant 0,65 s : le disque touché qui s'ouvre, celui qu'on quitte
        qui se referme, les deux coches, le voile — les mêmes valeurs au
        même instant (à une image près) ;
     4. au Profil, la rangée n'a pas bougé : le disque retenu reste aligné
        sur le bord du champ, et d'un disque à l'autre il y a toujours
        2,77rem ;
     5. aucune erreur.
   Usage : node banc-essai/pastilles-couleur.js [url] */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const URL = process.argv[2] || 'http://127.0.0.1:8099/index.html';
const IOS = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1';
const AND = 'Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36';
let ko = 0;
const dit = (q, b, d) => { if (!b) ko++; console.log('  ' + (b ? 'OK  ' : 'KO  ') + q + (d ? '   (' + String(d).slice(0, 360) + ')' : '')); };

/* Ce qu'est une pastille, lu au style : le bouton, son disque (un élément à
   lui, ou — avant la v333, au Profil — la boîte de contenu du bouton), sa
   coche, son voile d'appui (::before). */
const MESURES = () => {
  window.__pastille = (b) => {
    const r = b.getBoundingClientRect(), cs = getComputedStyle(b);
    const d = b.querySelector('.gt-disque');
    let disque, ombre;
    if (d) { const q = d.getBoundingClientRect(); disque = { l: q.left - r.left, w: q.width }; const ds = getComputedStyle(d); ombre = ds.boxShadow + ' / ' + ds.filter; }
    else { const pl = parseFloat(cs.paddingLeft); disque = { l: pl, w: r.width - pl - parseFloat(cs.paddingRight) }; ombre = cs.boxShadow + ' / ' + cs.filter; }
    const ck = b.querySelector('.cd-ck'), ks = getComputedStyle(ck);
    const m = /matrix\(([^,]+)/.exec(ks.transform || ''); const av = getComputedStyle(b, '::before');
    const mv = /matrix\(([^,]+)/.exec(av.transform || '');
    return { bouton: r.width, disque: disque.w, gauche: disque.l, ombre, coche: { op: +ks.opacity, k: m ? +m[1] : 1, w: ck.getBoundingClientRect().width },
      voile: { teinte: (cs.getPropertyValue('--press-tint') || '').trim(), rayon: av.borderTopLeftRadius, op: +av.opacity, k: mv ? +mv[1] : (av.transform === 'none' ? 1 : 0) } };
  };
  /* Filmer : à chaque image, les deux pastilles qui comptent — et l'instant
     où le doigt se pose et celui du clic, pour caler les deux films sur le
     geste et non sur le moment où la caméra a démarré. */
  window.__filmer = (rangee, ancien, nouveau, ms) => new Promise((ok) => {
    const bs = [...document.querySelectorAll(rangee)];
    const a = bs[ancien], n = bs[nouveau], t0 = performance.now(), film = [], geste = {};
    const noter = (k) => (e) => { if (geste[k] === undefined) geste[k] = performance.now() - t0; };
    const pd = noter('doigt'), cl = noter('clic');
    document.addEventListener('pointerdown', pd, true); document.addEventListener('click', cl, true);
    const pas = () => {
      const t = performance.now() - t0;
      const pa = window.__pastille(a), pn = window.__pastille(n);
      film.push({ t, nd: pn.disque, nck: pn.coche.op, nk: pn.coche.k, nv: pn.voile.op, nvk: pn.voile.k, ad: pa.disque, ack: pa.coche.op, ak: pa.coche.k });
      if (t < ms) requestAnimationFrame(pas);
      else { document.removeEventListener('pointerdown', pd, true); document.removeEventListener('click', cl, true); ok({ film, geste }); }
    };
    requestAnimationFrame(pas);
  });
};

(async () => {
  const nav = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const errs = [];
  try {
    for (const [tel, ua] of [['iPhone', IOS], ['Android', AND]]) {
      console.log('  — ' + tel);
      const ctx = await nav.newContext({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, userAgent: ua, serviceWorkers: 'block' });
      const p = await ctx.newPage();
      p.on('pageerror', e => errs.push(tel + ' : ' + e.message));
      await p.route('**/supabase-js@2*', (route) => route.fulfill({ status: 200, contentType: 'application/javascript', body: '' }));
      await p.addInitScript(() => { localStorage.setItem('bt_profile', JSON.stringify({ name: 'Taylor', color: '#3E8EE0' })); localStorage.setItem('bt_fs_hint', '1'); });
      await p.goto(URL);
      await p.waitForFunction(() => { try { return state.screen === 'mode'; } catch (e) { return false; } }, null, { timeout: 25000 });
      await p.evaluate(MESURES);
      const cdp = await ctx.newCDPSession(p);
      const enfoncement = async (sel) => {
        const s = await ctx.newCDPSession(p);
        await s.send('DOM.enable'); await s.send('CSS.enable');
        const { root } = await s.send('DOM.getDocument', { depth: -1 });
        const { nodeId } = await s.send('DOM.querySelector', { nodeId: root.nodeId, selector: sel });
        await s.send('CSS.forcePseudoState', { nodeId, forcedPseudoClasses: ['active'] });
        await p.waitForTimeout(260);
        const k = await p.evaluate((sel) => { const m = /matrix\(([^,]+)/.exec(getComputedStyle(document.querySelector(sel)).transform || ''); return m ? Math.round(+m[1] * 1000) / 1000 : 1; }, sel);
        await s.send('CSS.forcePseudoState', { nodeId, forcedPseudoClasses: [] });
        await s.detach();
        await p.waitForTimeout(500);
        return k;
      };
      /* Une rangée : son état au repos, son enfoncement, puis le film d'un
         tapotement sur la troisième pastille (la première est retenue). */
      const passer = async (rangee) => {
        await p.waitForTimeout(700);
        const repos = await p.evaluate((r) => { const bs = [...document.querySelectorAll(r)]; return { quittee: window.__pastille(bs[2]), retenue: window.__pastille(bs[0]) }; }, rangee);
        const k = await enfoncement(rangee + ':nth-of-type(3)');
        await p.locator(rangee).nth(2).scrollIntoViewIfNeeded().catch(() => {});
        await p.waitForTimeout(200);
        const r = await p.locator(rangee).nth(2).boundingBox();
        const film = p.evaluate((r) => window.__filmer(r, 0, 2, 900), rangee);
        await p.waitForTimeout(30);
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: r.x + r.width / 2, y: r.y + r.height / 2 }] });
        await p.waitForTimeout(90);
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
        return { repos, k, film: await film };
      };

      /* Le Profil (sa couleur est la première). La rangée se mesure avant le
         tapotement, qui déplace la couleur retenue. */
      await p.evaluate(() => { state.screen = 'profile'; render(); });
      await p.waitForTimeout(700);
      const ligne = await p.evaluate(() => {
        const f = document.getElementById('profileName').getBoundingClientRect();
        const ds = [...document.querySelectorAll('.color-row .color-dot')].map(b => { const d = b.querySelector('.gt-disque'); const q = (d || b).getBoundingClientRect(); return { l: q.left, c: q.left + q.width / 2, sel: b.classList.contains('sel') }; });
        const rem = parseFloat(getComputedStyle(document.documentElement).fontSize);
        const sel = ds.find(x => x.sel);
        return { champ: f.left, retenu: sel ? sel.l : null, pas: ds.slice(1).map((x, i) => x.c - ds[i].c), attendu: 2.77 * rem };
      });
      const P = await passer('.color-row .color-dot');
      /* Un groupe : créer, la couleur 1 retenue. */
      await p.evaluate(() => { document.documentElement.classList.add('is-standalone');
        compte.dispo = true; compte.session = { user: { id: 'moi-0', email: 'j@e.net' } }; compte.etape = 'connecte';
        grp.installe = true; grp.ouverts = true; grp.etat = { participe: 'ok', moderateur: false, photos: true, logos: true }; grp.liste = []; grp.publics = [];
        state.screen = 'groupes'; render(); ouvrirCreation(); });
      await p.waitForTimeout(600);
      await p.evaluate(() => choisirTeinte(0));
      const G = await passer('.grp-teintes .grp-teinte');

      /* 1 */
      const forme = (x) => ({ bouton: Math.round(x.bouton * 10) / 10, disque: Math.round(x.disque * 10) / 10, voileAutour: Math.round((x.bouton - x.disque) * 5) / 10,
        ombre: x.ombre, coche: Math.round(x.coche.w * 10) / 10, teinte: x.voile.teinte, rayon: x.voile.rayon });
      const champs = ['bouton', 'disque', 'voileAutour', 'ombre', 'coche', 'teinte', 'rayon'];
      const diff = [];
      for (const etat of ['quittee', 'retenue']) {
        const a = forme(P.repos[etat]), b = forme(G.repos[etat]);
        for (const c of champs) if (JSON.stringify(a[c]) !== JSON.stringify(b[c])) diff.push(etat + '.' + c + ' : Profil ' + JSON.stringify(a[c]) + ' ≠ groupe ' + JSON.stringify(b[c]));
      }
      dit('1. au repos, la même pastille (bouton, disque quitté et retenu, ombre, coche, voile)', !diff.length, diff.join(' · ') || JSON.stringify(forme(P.repos.quittee)));
      /* 2 */
      dit('2. sous le doigt, le même enfoncement', P.k === G.k && P.k < 0.99, 'Profil ' + P.k + ' · groupe ' + G.k);
      /* 3 — les deux films, relus aux mêmes instants du geste : le voile
         d'appui depuis le contact du doigt, le disque et la coche depuis le
         clic (c'est lui qui change la couleur retenue). */
      const a = (film, t, k) => { let i = film.findIndex(f => f.t >= t); if (i < 0) return film[film.length - 1][k]; if (i === 0) return film[0][k]; const f0 = film[i - 1], f1 = film[i]; return f0[k] + (f1[k] - f0[k]) * (t - f0.t) / (f1.t - f0.t || 1); };
      const TOL = { nd: 0.9, ad: 0.9, nck: 0.12, ack: 0.12, nk: 0.08, ak: 0.08, nv: 0.12, nvk: 0.1 };
      const DEPUIS = { nv: 'doigt', nvk: 'doigt', nd: 'clic', ad: 'clic', nck: 'clic', ack: 'clic', nk: 'clic', ak: 'clic' };
      const ecarts = [], geste = [];
      for (const [nom, X] of [['Profil', P], ['groupe', G]]) if (X.film.geste.doigt === undefined || X.film.geste.clic === undefined) geste.push(nom + ' : ' + JSON.stringify(X.film.geste));
      /* À UNE IMAGE PRÈS. Deux films ne tombent jamais sur les mêmes images :
         l'animation part au contact, la caméra prend la suivante (16 ms plus
         tard, ou presque tout de suite). Sur la montée du voile — 0,2 de
         plus toutes les 30 ms —, cette image d'écart pesait 0,13 : la même
         courbe, décalée. Chaque valeur de l'un doit donc se retrouver chez
         l'autre dans les 25 ms qui l'entourent. */
      const voisine = (X, t, k) => { const v = [-25, -12, 0, 12, 25].map(d => a(X.film.film, t + d, k)); return [Math.min(...v), Math.max(...v)]; };
      if (!geste.length) for (let t = 0; t <= 600; t += 30) for (const k of Object.keys(TOL)) {
        const tp = P.film.geste[DEPUIS[k]] + t, tg = G.film.geste[DEPUIS[k]] + t;
        const x = a(P.film.film, tp, k), y = a(G.film.film, tg, k);
        const [gy, hy] = voisine(G, tg, k), [gx, hx] = voisine(P, tp, k);
        const loin = (x < gy - TOL[k] || x > hy + TOL[k]) || (y < gx - TOL[k] || y > hx + TOL[k]);
        if (loin) ecarts.push(k + '@' + t + 'ms ' + x.toFixed(2) + '≠' + y.toFixed(2));
      }
      if (process.env.FILM) for (const [nom, X] of [['Profil', P], ['groupe', G]]) console.log(nom, JSON.stringify(X.film.geste), X.film.film.filter((f, i) => i % 2 === 0).map(f => Math.round(f.t - X.film.geste.doigt) + ':' + f.nv.toFixed(2) + '/' + f.nvk.toFixed(2)).join(' '));
      const fini = P.film.film[P.film.film.length - 1], finiG = G.film.film[G.film.film.length - 1];
      const bout = fini.nck > 0.95 && fini.ack < 0.05 && finiG.nck > 0.95 && finiG.ack < 0.05;
      dit('3. un tapotement filmé : les mêmes valeurs au même instant, du premier contact à la fin', !geste.length && !ecarts.length && bout,
        (geste.join(' · ') || ecarts.slice(0, 6).join(' · ') || ('disque ' + fini.ad.toFixed(1) + ' → ' + fini.nd.toFixed(1) + ' px, ' + P.film.film.length + '/' + G.film.film.length + ' images')) + (bout ? '' : ' · fin : ' + JSON.stringify([fini, finiG])));
      /* 4 */
      const pasOk = ligne.pas.length === 5 && ligne.pas.every(x => Math.abs(x - ligne.attendu) < 0.6);
      dit('4. au Profil, la rangée n\'a pas bougé (disque retenu sur le bord du champ, 2,77rem d\'un disque à l\'autre)',
        ligne.retenu !== null && Math.abs(ligne.retenu - ligne.champ) < 0.6 && pasOk,
        'champ ' + ligne.champ.toFixed(1) + ' · retenu ' + (ligne.retenu === null ? '?' : ligne.retenu.toFixed(1)) + ' · pas ' + ligne.pas.map(x => x.toFixed(1)).join(',') + ' (attendu ' + ligne.attendu.toFixed(1) + ')');
      await ctx.close();
    }
    dit('5. aucune erreur', !errs.length, errs.slice(0, 3).join(' | '));
  } catch (e) { console.error(e); ko++; }
  finally { await nav.close(); }
  console.log(ko ? '\n  ' + ko + ' défaut(s)' : '\n  OK — toucher une couleur, c\'est le même geste au Profil et dans un groupe');
  process.exit(ko ? 1 : 0);
})();
