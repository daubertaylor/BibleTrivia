/* ====== BANC « LA FENÊTRE PART AVEC SA PAGE, L'ÉCRAN QUI ARRIVE EST DÉJÀ LÀ » (v373) ======
   « Pour l'animation de transition de page, parfois sur certaines pages
     comme par exemple Range les livres, lorsque je quitte ou que j'ouvre la
     page, je vois que ça n'apparaît pas au bon moment. En fait, c'est pas
     comme si c'était déjà là. »
   Filmé avant la v373 : Range les livres, « Quitter la partie ? »,
   « Quitter ». La fenêtre et son voile s'effaçaient SUR PLACE pendant que
   les deux écrans glissaient dessous — le voile encore à 93 % à 100 ms :
   l'écran des jeux arrivait assombri, « Quitter la partie ? » en fantôme
   sur ses tuiles, et ne s'éclaircissait qu'après.
   Sur un iPhone, image par image :
     1. Range les livres, « Quitter » : pendant tout le glissement, le voile
        de la fenêtre est COLLÉ à l'écran qu'on quitte (la même translation,
        au pixel près) et ne passe jamais sur l'écran des jeux qui arrive ;
        puis il n'en reste rien dans la page — sur un téléphone lent aussi
        (processeur ralenti six fois), où dessiner l'écran suivant prend
        plus d'un dixième de seconde avant que la fenêtre se ferme ;
     2. le même geste depuis une partie Solo (« Quitter la partie ? ») ;
     3. « Rester » : rien ne glisse, la fenêtre s'efface sur place, et la
        partie est toujours là ;
     4. chacun des cinq jeux, ouvert puis quitté : l'écran qui arrive est
        RIGIDE — chaque élément à sa place dans l'écran et à son opacité
        finale dès la première image du glissement — et rien ne passe
        devant lui ;
     5. aucune erreur.
   Usage : node banc-essai/fenetre-page.js [url] */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const URL = process.env.URL_ESSAI || process.argv[2] || 'http://127.0.0.1:8099/index.html';
const IOS = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1';
let ko = 0;
const dit = (quoi, bon, detail) => { console.log('  ' + (bon ? 'OK  ' : 'KO  ') + quoi + (detail ? '  (' + String(detail).slice(0, 420) + ')' : '')); if (!bon) ko++; };

(async () => {
  const nav = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const erreurs = [];
  try {
    const ctx = await nav.newContext({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true, userAgent: IOS, serviceWorkers: 'block' });
    await ctx.route('**/pagead2.googlesyndication.com/**', r => r.abort());
    await ctx.route('**/supabase-js@2*', r => r.fulfill({ status: 200, contentType: 'application/javascript', body: '' }));
    await ctx.addInitScript(() => {
      localStorage.setItem('bt_profile', JSON.stringify({ name: 'Taylor', color: '#4C86E8' }));
      localStorage.setItem('bt_fs_hint', '1');
      localStorage.setItem('bt_settings', JSON.stringify({ sfx: false, music: false }));
      /* Le jour est déjà joué : pas de fête de la flamme au milieu du banc. */
      { const d = new Date(), z = n => String(n).padStart(2, '0'), k = d.getFullYear() + '-' + z(d.getMonth() + 1) + '-' + z(d.getDate());
        localStorage.setItem('bt_daily', JSON.stringify({ last: k, streak: 1, score: 0, total: 0, jours: [k], geles: [], palier: 0 })); }
    });
    const p = await ctx.newPage();
    p.on('pageerror', e => erreurs.push(e.message));
    await p.goto(URL);
    await p.waitForFunction(() => { try { return state.screen === 'mode' && !document.getElementById('barreBas').classList.contains('cachee'); } catch (e) { return false; } }, null, { timeout: 25000 });
    await p.waitForTimeout(1200);

    /* Le film d'un geste : à chaque image, la translation de l'écran quitté,
       de celui qui arrive, du voile ; et (rigidité) la place et l'opacité de
       chaque élément de l'écran qui arrive, comparées à l'image finale. */
    const filmer = (geste) => p.evaluate((geste) => new Promise(res => {
      const opa = (el, stop) => { let o = 1; for (let x = el; x && x !== stop; x = x.parentElement) { const c = getComputedStyle(x); o *= parseFloat(c.opacity); if (c.visibility === 'hidden') o = 0; } return o; };
      const tx = (el) => { const v = el ? getComputedStyle(el).translate : 'none'; return (!v || v === 'none') ? 0 : parseFloat(v) || 0; };
      const nomDe = (el) => el.tagName.toLowerCase() + (el.className && el.className.baseVal === undefined ? '.' + String(el.className).trim().split(/\s+/).slice(0, 2).join('.') : '');
      const voiles = () => [...document.querySelectorAll('.modal-veil')];
      const avant = typeof passage !== 'undefined' ? passage : null;
      const t0 = performance.now();
      new Function(geste)();
      const pp = (typeof passage !== 'undefined' && passage !== avant) ? passage : null;
      const W = innerWidth;
      const images = [];
      const tic = () => {
        const t = performance.now() - t0;
        const e = pp ? pp.entrant : document.querySelector('#app > .screen:not(.screen-exit)');
        const re = e.getBoundingClientRect();
        const els = new Map();
        for (const el of e.querySelectorAll('*')) {
          const r = el.getBoundingClientRect();
          if (r.width < 1 || r.height < 1) continue;
          els.set(el, [r.left - re.left, r.top - re.top, r.width, r.height, opa(el, e.parentElement)]);
        }
        const v = voiles().filter(x => x.isConnected);
        images.push({ t, xs: pp && pp.sortant && pp.sortant.isConnected ? tx(pp.sortant) : null, xe: pp ? tx(e) : 0,
          voiles: v.map(x => ({ x: tx(x), o: opa(x, document.documentElement) })), els });
        if (t < 950) requestAnimationFrame(tic); else fin();
      };
      const fin = () => {
        const der = images[images.length - 1];
        let colle = 0, decolle = 0, dessus = 0, pire = null, rigide = 0, nonPose = [];
        for (const im of images) {
          const glisse = Math.abs(im.xe) >= 0.5;
          if (!glisse) continue;
          for (const v of im.voiles) {
            if (v.o < 0.01) continue;
            if (im.xs !== null && Math.abs(v.x - im.xs) <= 1) colle++; else { decolle++; pire = pire || { t: Math.round(im.t), voile: Math.round(v.x), ecran: im.xs === null ? null : Math.round(im.xs) }; }
            /* l'écran qui arrive occupe [xe, xe + W] ; le voile, [x, x + W] */
            const recouvre = Math.min(im.xe + W, v.x + W) - Math.max(im.xe, v.x);
            if (recouvre > 1) dessus++;
          }
          for (const [el, f] of der.els) {
            if (f[4] < 0.05) continue;
            const c = im.els.get(el);
            const d = c ? Math.max(Math.abs(c[0] - f[0]), Math.abs(c[1] - f[1]), Math.abs(c[2] - f[2]), Math.abs(c[3] - f[3])) : 99;
            if (!c || d > 1 || f[4] - c[4] > 0.05) { if (nonPose.length < 4) nonPose.push(nomDe(el) + (c ? ' ' + d.toFixed(0) + 'px/' + Math.round(c[4] * 100) + '%' : ' absent') + '@' + Math.round(im.t)); rigide++; }
          }
        }
        res({ ecran: state.screen, passage: !!pp, genre: pp ? pp.genre : null, glissement: images.filter(im => Math.abs(im.xe) >= 0.5).length,
          colle, decolle, pire, dessus, rigide, nonPose, voilesRestants: voiles().length,
          voileFin: images.length ? images[images.length - 1].voiles.map(v => Math.round(v.x)) : [] });
      };
      requestAnimationFrame(tic);
    }), geste);
    const OK = "document.getElementById('modalOk').click()";
    const RESTER = "[...document.querySelectorAll('#modalVeil button')].find(x => /Rester/.test(x.textContent)).click()";

    /* ---- 1 ---- Range les livres, « Quitter » */
    await p.evaluate(() => allerOnglet('jeux')); await p.waitForTimeout(1100);
    await p.evaluate(() => lancerJeu('livres')); await p.waitForTimeout(1100);
    await p.evaluate(() => quitterJeu()); await p.waitForTimeout(500);
    const f1 = await filmer(OK);
    dit('1. Range les livres, « Quitter » : le voile reste collé à l\'écran qu\'on quitte, ne passe jamais sur l\'écran des jeux, puis disparaît',
      f1.ecran === 'jeux' && f1.passage && f1.genre === 'retour' && f1.glissement >= 8 && f1.colle >= 4 && f1.decolle === 0 && f1.dessus === 0 && f1.voilesRestants === 0,
      JSON.stringify(f1));

    /* ---- 1 bis ---- le même geste sur un téléphone lent (processeur ralenti
       six fois) : dessiner l'écran des jeux y prend plus d'un dixième de
       seconde avant que la fenêtre se ferme — elle doit partir avec sa page
       quand même. */
    {
      const cdp = await ctx.newCDPSession(p);
      const lents = [];
      for (const id of ['quiou', 'erreur', 'livres']) {
        await p.evaluate((id) => { jeu = null; lancerJeu(id); }, id); await p.waitForTimeout(1600);
        await p.evaluate(() => quitterJeu()); await p.waitForTimeout(700);
        await cdp.send('Emulation.setCPUThrottlingRate', { rate: 6 });
        const f = await filmer(OK);
        await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
        lents.push({ id, ecran: f.ecran, colle: f.colle, decolle: f.decolle, dessus: f.dessus });
        await p.waitForTimeout(900);
      }
      dit('1 bis. sur un téléphone lent (processeur ralenti six fois), la fenêtre part avec sa page quand même',
        lents.every(f => f.ecran === 'jeux' && f.colle >= 2 && f.decolle === 0 && f.dessus === 0), JSON.stringify(lents));
    }

    /* ---- 2 ---- une partie Solo, « Quitter la partie ? » */
    await p.evaluate(() => allerOnglet('mode')); await p.waitForTimeout(1100);
    await p.evaluate(() => { state.mode = 'solo'; state.screen = 'setup'; render(); }); await p.waitForTimeout(1100);
    await p.evaluate(() => startGame()); await p.waitForTimeout(1200);
    await p.evaluate(() => confirmLeaveGame()); await p.waitForTimeout(500);
    const f2 = await filmer(OK);
    dit('2. une partie Solo, « Quitter la partie ? », « Quitter » : la fenêtre part avec la partie, rien devant l\'écran qui arrive',
      f2.passage && f2.ecran !== 'play' && f2.glissement >= 8 && f2.colle >= 4 && f2.decolle === 0 && f2.dessus === 0 && f2.voilesRestants === 0,
      JSON.stringify(f2));

    /* ---- 3 ---- « Rester » */
    await p.evaluate(() => allerOnglet('jeux')); await p.waitForTimeout(1100);
    await p.evaluate(() => lancerJeu('combien')); await p.waitForTimeout(1100);
    await p.evaluate(() => quitterJeu()); await p.waitForTimeout(500);
    const f3 = await filmer(RESTER);
    dit('3. « Rester » : rien ne glisse, la fenêtre s\'efface sur place, la partie est toujours là',
      !f3.passage && f3.ecran === 'jeu' && f3.voilesRestants === 0 && f3.voileFin.every(x => x === 0),
      JSON.stringify(f3));

    /* ---- 4 ---- les cinq jeux, ouverts puis quittés */
    await p.evaluate(() => { jeu = null; allerOnglet('jeux'); }); await p.waitForTimeout(1100);
    const jeux = [];
    for (const id of ['livres', 'quiou', 'combien', 'erreur', 'morceaux']) {
      const o = await filmer("lancerJeu('" + id + "')");
      await p.waitForTimeout(700);
      await p.evaluate(() => quitterJeu()); await p.waitForTimeout(500);
      const q = await filmer(OK);
      await p.waitForTimeout(700);
      jeux.push({ id, ouvre: [o.ecran, o.glissement, o.rigide, o.dessus, o.nonPose.join(' ')], quitte: [q.ecran, q.glissement, q.rigide, q.dessus, q.decolle, q.nonPose.join(' ')] });
    }
    dit('4. les cinq jeux, ouverts puis quittés : l\'écran qui arrive est entier et à sa place dès la première image, rien ne passe devant lui',
      jeux.every(j => j.ouvre[0] === 'jeu' && j.ouvre[1] >= 8 && j.ouvre[2] === 0 && j.ouvre[3] === 0 && j.quitte[0] === 'jeux' && j.quitte[1] >= 8 && j.quitte[2] === 0 && j.quitte[3] === 0 && j.quitte[4] === 0),
      JSON.stringify(jeux));
    await ctx.close();
  } catch (e) {
    dit('le banc s\'est arrêté', false, (e.stack || e).toString().slice(0, 500));
  } finally {
    dit('5. aucune erreur', erreurs.length === 0, erreurs.slice(0, 3).join(' | '));
    await nav.close().catch(() => {});
  }
  console.log(ko ? '\n  ' + ko + ' KO' : '\n  OK — la fenêtre part avec sa page, et l\'écran qui arrive est déjà là');
  process.exit(ko ? 1 : 0);
})();
