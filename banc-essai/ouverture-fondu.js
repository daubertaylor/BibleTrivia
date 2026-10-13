/* ====== BANC « LE CHARGEMENT S'EFFACE SUR L'ACCUEIL DÉJÀ PEINT » (v323) ======
   « Lors de la transition entre l'écran de chargement et l'écran d'accueil,
     je me demande si les petits appareils pas trop puissants souffrent de ça
     et buguent. Ne vaut-il pas mieux un truc beaucoup plus classique, mais
     qui reste très clean ? »
   Mesuré avant la v323, processeur divisé par 4 puis par 6 : construire
   l'accueil tient une image de 230 à 430 ms, et l'accueil MONTAIT pendant ce
   temps — l'écran restait figé, puis l'accueil surgissait aux trois quarts de
   sa course. Ce banc ralentit le processeur (x4) comme un petit téléphone,
   sur iPhone et sur Android, et exige :
     1. que l'image lourde tombe PENDANT que le chargement couvre encore tout
        (le voile plein) : on ne voit rien s'arrêter ;
     2. que le fondu qui suit soit fluide : aucune image de plus de 50 ms ;
     3. que la colombe et le titre ne repartent pas de zéro en changeant de
        calque (leurs animations reprennent au même instant) ;
     4. que l'accueil soit posé sur place, sans glisser sous le voile ;
     5. que le voile s'en aille, et qu'il ne reste que l'accueil, prêt ;
     6. aucune erreur.
   Usage : node banc-essai/ouverture-fondu.js [url] */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const URL = process.argv[2] || process.env.URL || 'http://127.0.0.1:8099/index.html';
const UAS = {
  iPhone: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
  Android: 'Mozilla/5.0 (Linux; Android 14; Pixel 6a) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Mobile Safari/537.36',
};
let ko = 0;
const dit = (q, b, d) => { console.log('  ' + (b ? 'OK  ' : 'KO  ') + q + (d ? '  (' + String(d).slice(0, 260) + ')' : '')); if (!b) ko++; };
(async () => {
  const nav = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  try {
    for (const [nom, ua] of Object.entries(UAS)) {
      const ctx = await nav.newContext({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true, userAgent: ua, serviceWorkers: 'block' });
      const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
      await p.route('**/supabase-js@2*', r => r.fulfill({ status: 200, contentType: 'application/javascript', body: '' }));
      const cdp = await ctx.newCDPSession(p);
      await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
      await p.addInitScript(() => {
        localStorage.setItem('bt_profile', JSON.stringify({ name: 'Taylor', color: '#4C86E8' })); localStorage.setItem('bt_fs_hint', '1');
        window.__f = [];
        const boucle = (t) => {
          const r = { t, e: '', v: -1, colombe: null, lettres: null, monte: null, glisse: null };
          try {
            r.e = state.screen;
            const o = document.querySelector('.ouverture-voile'); if (o) r.v = +getComputedStyle(o).opacity;
            const w = document.querySelector('.splash-dove-wrap'); if (w) { r.colombe = +getComputedStyle(w).opacity; const a = w.getAnimations().find(x => x.animationName === 'splashRiseBig'); r.monte = a ? a.currentTime : null; }
            const l = document.querySelectorAll('.splash-l'); if (l.length) r.lettres = Math.min(...[...l].map(x => +getComputedStyle(x).opacity));
            const ac = document.querySelector('#app > .screen'); if (ac && r.e === 'mode') r.glisse = ac.classList.contains('screen-enter') || getComputedStyle(ac).transform !== 'none';
          } catch (x) {}
          window.__f.push(r); if (t < 9500) requestAnimationFrame(boucle);
        };
        requestAnimationFrame(boucle);
      });
      await p.goto(URL);
      await p.waitForFunction(() => window.__f.length && window.__f[window.__f.length - 1].t > 9000, null, { timeout: 90000 });
      const f = await p.evaluate(() => window.__f);
      const i0 = f.findIndex(x => x.e === 'mode');
      dit(nom + ' : l\'accueil arrive', i0 > 0);
      if (i0 <= 0) continue;
      /* 1. l'image lourde, et le voile à ce moment-là */
      let lourde = 0, k0 = i0;
      for (let k = Math.max(1, i0 - 2); k < Math.min(f.length, i0 + 6); k++) { const d = f[k].t - f[k - 1].t; if (d > lourde) { lourde = d; k0 = k; } }
      dit(nom + ' : l\'image lourde (' + Math.round(lourde) + ' ms) tombe sous le voile plein', f[k0].v === 1 || (f[k0].v === -1 && f[k0].e === 'splash'), JSON.stringify(f[k0]));
      /* 2. le fondu */
      const fondu = f.filter(x => x.v >= 0 && x.v < 0.999);
      const d = []; for (let k = 1; k < fondu.length; k++) d.push(fondu[k].t - fondu[k - 1].t);
      dit(nom + ' : le fondu est fluide (aucune image de plus de 50 ms)', fondu.length >= 8 && d.every(x => x <= 50), fondu.length + ' images, max ' + (d.length ? Math.round(Math.max(...d)) : 0) + ' ms');
      /* 3. la colombe et le titre ne repartent pas de zéro */
      const sous = f.filter(x => x.v >= 0);
      dit(nom + ' : la colombe et le titre restent posés en changeant de calque', sous.length > 0 && sous.every(x => x.colombe === null || (x.colombe >= 0.99 && x.lettres >= 0.99 && (x.monte === null || x.monte >= 1100))),
        JSON.stringify(sous.slice(0, 2)));
      /* 4. l'accueil posé sur place */
      const pose = f.slice(i0, i0 + 4).filter(x => x.glisse !== null);
      dit(nom + ' : l\'accueil est posé sur place, sans glisser sous le voile', pose.length > 0 && pose.every(x => x.glisse === false), JSON.stringify(pose.map(x => x.glisse)));
      /* 5. à la fin */
      const fin = await p.evaluate(() => ({ voile: !!document.querySelector('.ouverture-voile'), splash: !!document.querySelector('.splash-screen'), ecran: state.screen, cartes: document.querySelectorAll('#app .mode-card').length }));
      dit(nom + ' : le voile s\'en va, l\'accueil reste seul', !fin.voile && !fin.splash && fin.ecran === 'mode' && fin.cartes >= 3, JSON.stringify(fin));
      dit(nom + ' : aucune erreur', errs.length === 0, errs.slice(0, 2).join(' | '));
      await ctx.close();
    }
  } catch (e) { console.log('  KO  le banc s\'est arrêté : ' + (e.stack || e).toString().slice(0, 600)); ko++; }
  finally { await nav.close().catch(() => {}); }
  console.log(ko ? '\n  ' + ko + ' KO' : '\n  OK — le chargement s\'efface sur un accueil déjà prêt, même sur un petit téléphone');
  process.exit(ko ? 1 : 0);
})();
