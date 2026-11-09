/* ====== LA BARRE DU BAS FAIT CE QUE FAIT SA PAGE (v312, v345, v356, v357) ======
   « Les logos Accueil et Messages mettent un petit peu de temps, après une
     animation. » Au retour à l'accueil, la page arrivait de côté pendant que
     la barre remontait du bas, en place 0,48 s plus tard.
   La barre du bas appartient à l'accueil (et aux onglets) : elle fait ce
   que fait sa page. (v357) Les écrans sont côte à côte et glissent ensemble
   (voir LES ÉCRANS SONT CÔTE À CÔTE) : la barre glisse avec l'accueil,
   collée à lui. Image par image :
     1. retour de Progression : la barre ARRIVE avec l'accueil — à chaque
        image au même endroit que lui, sans le moindre mouvement vertical —,
        et entière à sa place à la fin ;
     2. départ vers Progression : elle PART avec l'accueil, collée à lui,
        sans mouvement vertical, puis se range ;
     3. entre Accueil et Groupes : elle ne bouge pas d'un pixel ;
     4. aller-retour très rapide : elle finit à sa place, sans classe oubliée ;
     5. des rendus pendant l'arrivée ne laissent aucune animation collée, et
        elle se cache bien quand le clavier monte ;
     6. aucune erreur.
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
  /* Le film : la barre, l'accueil qui part ou qui arrive, à chaque image. */
  const filme = (geste, ms) => p.evaluate(([g, ms]) => new Promise(res => {
    const l = []; const t0 = performance.now();
    new Function(g)();
    const tx = (e) => { if (!e) return null; const v = getComputedStyle(e).translate; return (!v || v === 'none') ? 0 : (parseFloat(v) || 0); };
    const tic = () => {
      const b = document.getElementById('barreBas'), r = b.getBoundingClientRect();
      const part = document.querySelector('#app > .screen.screen-exit'), arrive = document.querySelector('#app > .screen:not(.screen-exit)');
      l.push({ t: performance.now() - t0, l: r.left, top: r.top, bx: tx(b), op: +getComputedStyle(b).opacity, cachee: b.classList.contains('cachee'),
        part: tx(part), arrive: tx(arrive), enRoute: !!passage });
      if (performance.now() - t0 < ms) requestAnimationFrame(tic); else res(l);
    };
    requestAnimationFrame(tic);
  }), [geste, ms]);

  /* ---- 2. départ ---- */
  const dep = await filme('openParcours()', 900);
  const vusD = dep.filter(x => x.enRoute && !x.cachee && x.part !== null);
  const ecartD = vusD.length ? Math.max(...vusD.map(x => Math.abs(x.bx - x.part))) : 99;
  const enCoursD = vusD.filter(x => Math.abs(x.part) > 5).length;
  const verticalD = Math.max(0, ...dep.filter(x => !x.cachee).map(x => Math.abs(x.top - repos.t)));
  dit('vers Progression, la barre part avec l\'accueil : à chaque image, collée à lui', enCoursD >= 3 && ecartD <= 0.5, vusD.length + ' images (' + enCoursD + ' en plein glissement), écart max ' + ecartD.toFixed(2) + ' px');
  dit('… sans le moindre mouvement vertical', verticalD <= 0.5, 'écart vertical max ' + verticalD.toFixed(1) + ' px');
  dit('… puis se range', dep[dep.length - 1].cachee && !dep[dep.length - 1].enRoute);
  await p.waitForTimeout(600);

  /* ---- 1. retour ---- */
  const ret = await filme('goToModeSelect()', 1000);
  const vusR = ret.filter(x => x.enRoute && !x.cachee && x.arrive !== null);
  const ecartR = vusR.length ? Math.max(...vusR.map(x => Math.abs(x.bx - x.arrive))) : 99;
  const enCoursR = vusR.filter(x => Math.abs(x.arrive) > 5).length;
  const vertical = Math.max(0, ...ret.filter(x => !x.cachee).map(x => Math.abs(x.top - repos.t)));
  const der = ret[ret.length - 1];
  dit('au retour, la barre ne monte pas du bas : aucun mouvement vertical', vertical <= 0.5, 'écart vertical max ' + vertical.toFixed(1) + ' px');
  dit('… elle arrive avec l\'accueil : à chaque image, collée à lui', enCoursR >= 3 && ecartR <= 0.5, vusR.length + ' images (' + enCoursR + ' en plein glissement), écart max ' + ecartR.toFixed(2) + ' px');
  dit('… et entière, à sa place, à la fin', !der.cachee && der.op === 1 && der.bx === 0 && Math.abs(der.l - repos.l) < 0.5 && !der.enRoute, JSON.stringify(der));
  await p.waitForTimeout(500);

  /* ---- 3. Accueil -> Groupes ---- */
  const tab = await filme("allerOnglet('groupes')", 800);
  const bouge = Math.max(...tab.map(x => Math.max(Math.abs(x.l - repos.l), Math.abs(x.top - repos.t), Math.abs(x.bx))));
  dit('entre Accueil et Groupes, la barre ne bouge pas d\'un pixel', bouge <= 0.5 && tab.every(x => x.op > 0.99), bouge.toFixed(1) + ' px');
  await p.evaluate(() => allerOnglet('accueil'));
  await p.waitForTimeout(800);

  /* ---- 4. aller-retour rapide ---- */
  await p.evaluate(() => { openParcours(); setTimeout(() => goToModeSelect(), 120); });
  await p.waitForTimeout(1300);
  const fin = await p.evaluate(() => { const b = document.getElementById('barreBas'), r = b.getBoundingClientRect(); return { l: r.left, t: r.top, cls: b.className, op: +getComputedStyle(b).opacity, tr: getComputedStyle(b).translate }; });
  dit('aller-retour rapide : la barre finit à sa place, sans classe oubliée', Math.abs(fin.l - repos.l) < 0.5 && Math.abs(fin.t - repos.t) < 0.5 && fin.op > 0.99 && (fin.tr === 'none' || fin.tr === '0px') && !/arrive|part-cote|cachee|sans-transition/.test(fin.cls), JSON.stringify(fin));

  /* ---- 5. des rendus pendant l'arrivée ----
     Une liste qui arrive du serveur rappelle majBarre en plein mouvement :
     l'animation ne doit pas rester collée à la barre (elle l'emporterait
     ensuite sur « cachée » et sur le clavier). */
  await p.evaluate(() => openParcours());
  await p.waitForTimeout(700);
  await p.evaluate(() => { goToModeSelect(); setTimeout(() => majBarre(), 100); setTimeout(() => majBarre(), 250); setTimeout(() => majBarre(), 400); });
  await p.waitForTimeout(1200);
  const apres = await p.evaluate(() => { const b = document.getElementById('barreBas'); return { cls: b.className, anims: b.getAnimations().filter(a => a.constructor === Animation).length }; });
  dit('des rendus pendant son arrivée ne laissent aucune animation collée', !/arrive|part-cote|sans-transition/.test(apres.cls) && apres.anims === 0, JSON.stringify(apres));
  await p.evaluate(() => document.documentElement.classList.add('kb'));
  await p.waitForTimeout(800);
  const kb = await p.evaluate(() => document.getElementById('barreBas').getBoundingClientRect().top);
  dit('… et elle se cache bien quand le clavier monte', kb >= 874, 'haut de la barre ' + Math.round(kb) + ' px');
  await p.evaluate(() => document.documentElement.classList.remove('kb'));
  dit('aucune erreur', errs.length === 0, errs.slice(0, 2).join(' | '));
  await nav.close();
  console.log(ko ? '\n  ECHEC — ' + ko + ' point(s)' : '\n  OK — la barre fait ce que fait sa page : elle glisse avec elle, jamais ailleurs');
  process.exit(ko ? 1 : 0);
})();
