/* ====== LA BARRE DU BAS ARRIVE AVEC SA PAGE (v312) ======
   « Les logos Accueil et Messages mettent un petit peu de temps, après une
     animation. » Au retour à l'accueil, la page arrivait de côté pendant que
     la barre remontait du bas, en place 0,48 s plus tard. Image par image :
     1. retour de Progression : la barre arrive DE CÔTÉ, sans le moindre
        mouvement vertical, et elle est en place quand sa page l'est ;
     2. départ vers Progression : elle s'efface vite (fondu), puis se range ;
     3. entre Accueil et Groupes : elle ne bouge pas d'un pixel ;
     4. aller-retour très rapide : elle finit à sa place, sans classe oubliée ;
     5. aucune erreur.
   Usage : node banc-essai/barre-page.js [url] */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const URL = process.argv[2] || 'http://127.0.0.1:8099/index.html';
const IOS = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
let ko = 0;
const dit = (q, b, d) => { if (!b) ko++; console.log('  ' + (b ? 'OK  ' : 'KO  ') + q + (d ? '   (' + d + ')' : '')); };

(async () => {
  const nav = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const ctx = await nav.newContext({ viewport: { width: 402, height: 874 }, deviceScaleFactor: 1, userAgent: IOS, hasTouch: true, isMobile: true, serviceWorkers: 'block' });
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  const cdp = await ctx.newCDPSession(p);
  await cdp.send('Emulation.setSafeAreaInsetsOverride', { insets: { top: 62, bottom: 34, left: 0, right: 0 } });
  await p.addInitScript(() => {
    localStorage.setItem('bt_profile', JSON.stringify({ name: 'Taylor', color: '#4C86E8' })); localStorage.setItem('bt_fs_hint', '1');
    localStorage.setItem('bt_groupes_sonde', JSON.stringify({ installe: true, ouverts: true, version: 1, modo: false, quand: Date.now() }));
  });
  await p.goto(URL);
  await p.waitForFunction(() => { try { return state.screen === 'mode' && !document.getElementById('barreBas').classList.contains('cachee'); } catch (e) { return false; } }, null, { timeout: 20000 });
  await p.waitForTimeout(1500);
  const repos = await p.evaluate(() => { const r = document.getElementById('barreBas').getBoundingClientRect(); return { l: r.left, t: r.top }; });
  /* Le film : la barre et la page qui arrive, à chaque image. */
  const filme = (geste, ms) => p.evaluate(([g, ms]) => new Promise(res => {
    const l = []; const t0 = performance.now();
    new Function(g)();
    const tic = () => {
      const b = document.getElementById('barreBas'), r = b.getBoundingClientRect();
      const sc = document.querySelector('#app > .screen:not(.screen-exit)'), sr = sc ? sc.getBoundingClientRect() : { left: 0 };
      l.push({ t: performance.now() - t0, l: r.left, top: r.top, op: +getComputedStyle(b).opacity, cachee: b.classList.contains('cachee'), page: sr.left });
      if (performance.now() - t0 < ms) requestAnimationFrame(tic); else res(l);
    };
    requestAnimationFrame(tic);
  }), [geste, ms]);

  /* ---- 2. départ ---- */
  const dep = await filme('openParcours()', 900);
  /* Ce qu'on VOIT, pas la classe : « cachee » est posée tout de suite, alors
     que la barre met encore une demi-seconde à descendre sous le bord. */
  const efface = dep.find(x => x.op < 0.05 || x.top >= 874);
  dit('vers Progression, la barre s\'efface vite', !!efface && efface.t < 420, efface ? Math.round(efface.t) + ' ms' : 'jamais');
  dit('… puis se range sous le bord', dep[dep.length - 1].cachee);
  await p.waitForTimeout(600);

  /* ---- 1. retour ---- */
  const ret = await filme('goToModeSelect()', 1000);
  const vertical = Math.max(...ret.filter(x => !x.cachee && x.op > 0.05).map(x => Math.abs(x.top - repos.t)));
  const lateral = ret.filter(x => !x.cachee && x.op > 0.05).map(x => x.l - repos.l);
  const enPlace = ret.find((x, i) => i > 0 && Math.abs(x.l - repos.l) < 0.5 && Math.abs(x.top - repos.t) < 0.5 && x.op > 0.99);
  const pagePosee = ret.find((x, i) => i > 0 && Math.abs(x.page - ret[ret.length - 1].page) < 0.5);
  dit('au retour, la barre ne monte pas du bas : aucun mouvement vertical', vertical <= 0.5, 'écart vertical max ' + vertical.toFixed(1) + ' px');
  dit('… elle arrive de côté, du même côté que sa page', lateral.length > 2 && lateral[0] < -20 && Math.min(...ret.slice(0, 4).map(x => x.page)) < -20, 'départ ' + (lateral[0] || 0).toFixed(0) + ' px, page ' + Math.min(...ret.slice(0, 4).map(x => x.page)).toFixed(0) + ' px');
  dit('… et elle est en place en même temps que sa page', !!enPlace && !!pagePosee && Math.abs(enPlace.t - pagePosee.t) < 60, enPlace && pagePosee ? 'barre ' + Math.round(enPlace.t) + ' ms, page ' + Math.round(pagePosee.t) + ' ms' : 'jamais');
  await p.waitForTimeout(500);

  /* ---- 3. Accueil -> Groupes ---- */
  const tab = await filme("allerOnglet('groupes')", 800);
  const bouge = Math.max(...tab.map(x => Math.max(Math.abs(x.l - repos.l), Math.abs(x.top - repos.t))));
  dit('entre Accueil et Groupes, la barre ne bouge pas d\'un pixel', bouge <= 0.5 && tab.every(x => x.op > 0.99), bouge.toFixed(1) + ' px');
  await p.evaluate(() => allerOnglet('accueil'));
  await p.waitForTimeout(800);

  /* ---- 4. aller-retour rapide ---- */
  await p.evaluate(() => { openParcours(); setTimeout(() => goToModeSelect(), 120); });
  await p.waitForTimeout(1300);
  const fin = await p.evaluate(() => { const b = document.getElementById('barreBas'), r = b.getBoundingClientRect(); return { l: r.left, t: r.top, cls: b.className, op: +getComputedStyle(b).opacity }; });
  dit('aller-retour rapide : la barre finit à sa place, sans classe oubliée', Math.abs(fin.l - repos.l) < 0.5 && Math.abs(fin.t - repos.t) < 0.5 && fin.op > 0.99 && !/arrive|part-cote|cachee|sans-transition/.test(fin.cls), JSON.stringify(fin));

  /* ---- 5. des rendus pendant l'arrivée ----
     Une liste qui arrive du serveur rappelle majBarre en plein mouvement :
     l'animation ne doit pas rester collée à la barre (elle l'emporterait
     ensuite sur « cachée » et sur le clavier). */
  await p.evaluate(() => openParcours());
  await p.waitForTimeout(700);
  await p.evaluate(() => { goToModeSelect(); setTimeout(() => majBarre(), 100); setTimeout(() => majBarre(), 250); setTimeout(() => majBarre(), 400); });
  await p.waitForTimeout(1200);
  const apres = await p.evaluate(() => document.getElementById('barreBas').className);
  dit('des rendus pendant son arrivée ne laissent aucune animation collée', !/arrive|part-cote|sans-transition/.test(apres), apres);
  await p.evaluate(() => document.documentElement.classList.add('kb'));
  await p.waitForTimeout(800);
  const kb = await p.evaluate(() => document.getElementById('barreBas').getBoundingClientRect().top);
  dit('… et elle se cache bien quand le clavier monte', kb >= 874, 'haut de la barre ' + Math.round(kb) + ' px');
  await p.evaluate(() => document.documentElement.classList.remove('kb'));
  dit('aucune erreur', errs.length === 0, errs.slice(0, 2).join(' | '));
  await nav.close();
  console.log(ko ? '\n  ECHEC — ' + ko + ' point(s)' : '\n  OK — la barre arrive et part avec sa page');
  process.exit(ko ? 1 : 0);
})();
