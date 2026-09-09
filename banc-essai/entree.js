/* LE BAS DE L'ÉCRAN NE DOIT PAS ARRIVER APRÈS LE HAUT.

   « Lorsque je fais l'animation pour revenir au menu principal, le bas de
   l'écran se charge un peu plus lentement, on dirait que ça apparaît après. »

   Rien ne se chargeait : tous les repères de l'accueil sont posés à la même
   image (mesuré). C'était la COURSE. L'écran montait de TOUTE sa hauteur —
   874 px sur un iPhone 15 — et passait donc le plus clair du trajet à
   découvrir son propre bas : à 100 ms, 460 px étaient encore dehors, et la
   bande des sept jours n'apparaissait qu'à 390 ms.

   Le banc mesure la part de l'écran encore DEHORS à deux instants : au début
   du mouvement (100 ms) et à sa moitié (250 ms). PAS l'instant où le dernier
   pixel se pose : avec une courbe qui décélère, la fin est une traîne de
   quelques pixels qui dure longtemps sans que personne ne la voie. Ce qui se
   voit, c'est COMBIEN il manque.

       node entree.js                     (jeu servi en HTTP sur 8099)
       node entree.js <url>               (pour comparer une autre version)

   Repères : au plus 12 % dehors à 100 ms, au plus 4 % à 250 ms. La version
   d'avant en était à 59 % et 14 %. */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const IOS = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
const URL = process.env.URL_ESSAI || process.argv[2] || 'http://127.0.0.1:8099/index.html';
const GESTES = [
  ['retour au menu',     "state.screen='parcours'; render();", "state.screen='mode'; render();"],
  ['ouvrir Progression',  "state.screen='mode'; render();",     "state.screen='parcours'; render();"],
  ['ouvrir le Profil',    "state.screen='mode'; render();",     "state.screen='profile'; render();"],
  ['ouvrir En ligne',     "state.screen='mode'; render();",     "state.screen='online'; render();"],
];
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const ctx = await b.newContext({ viewport:{width:393,height:852}, deviceScaleFactor:2,
    userAgent:IOS, hasTouch:true, serviceWorkers:'block' });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.addInitScript(() => {
    localStorage.setItem('bt_profile', JSON.stringify({ name:'Taylor', color:'#4C86E8' }));
    localStorage.setItem('bt_fs_hint', '1');
    localStorage.setItem('bt_progress', JSON.stringify({ books:{'Genèse':12}, correct:126 }));
  });
  await p.goto(URL);
  await p.waitForFunction(() => { try { return state.screen === 'mode'; } catch(e){ return false; } }, null, { timeout:20000 });
  const duree = await p.evaluate(() => { const v = getComputedStyle(document.documentElement).getPropertyValue('--tr-plie');
    const m = String(v).match(/([\d.]+)s/); return m ? Math.round(parseFloat(m[1])*1000) : 520; });
  console.log('  durée de l\'entrée : ' + duree + ' ms\n');
  console.log('  geste                   dehors à 100 ms       dehors à 250 ms');
  let ok = true;
  for (const [nom, avant, geste] of GESTES) {
    await p.evaluate((q) => { new Function(q)(); }, avant);
    await p.waitForTimeout(1200);
    const r = await p.evaluate(({ geste }) => new Promise(res => {
      const t0 = performance.now(); const rel = [];
      // eslint-disable-next-line no-new-func
      new Function(geste)();
      const tic = () => { const t = performance.now() - t0;
        const e = document.querySelector('#app > .screen:not(.screen-exit)');
        if (e) { const b = e.getBoundingClientRect();
          rel.push([Math.round(t), Math.round(b.top*10)/10, Math.round(b.bottom*10)/10, Math.round(b.height*10)/10]); }
        if (t < 900) requestAnimationFrame(tic); else res(rel); };
      requestAnimationFrame(tic);
    }), { geste });
    if (r.length < 4) { console.log('   ' + nom.padEnd(22) + ' pas mesurable'); ok = false; continue; }
    const H = 852;
    const a = (ms) => { const x = r.reduce((m, y) => Math.abs(y[0]-ms) < Math.abs(m[0]-ms) ? y : m, r[0]);
      const dehors = Math.max(0, x[2] - H);
      return { px: Math.round(dehors), pc: Math.round((dehors / x[3]) * 1000) / 10 }; };
    const d100 = a(100), d250 = a(250);
    const bon = d100.pc <= 12 && d250.pc <= 4;
    if (!bon) ok = false;
    console.log('   ' + nom.padEnd(22) +
      String(d100.pc).padStart(7) + ' %' + String(d100.px).padStart(6) + ' px' +
      String(d250.pc).padStart(12) + ' %' + String(d250.px).padStart(6) + ' px' +
      (bon ? '' : '   <-- LE BAS ARRIVE APRÈS'));
  }
  if (errs.length) { ok = false; console.log('\n  ERREURS JS : ' + [...new Set(errs)].slice(0,3).join(' | ')); }
  console.log(ok ? '\n  OK — l\'écran arrive entier, le bas avec le haut' : '\n  ECHEC');
  await b.close();
  process.exit(ok ? 0 : 1);
})();
