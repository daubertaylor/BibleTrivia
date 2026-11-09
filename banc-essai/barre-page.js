/* ====== LA BARRE DU BAS FAIT CE QUE FAIT SA PAGE (v312, v345, v356) ======
   « Les logos Accueil et Messages mettent un petit peu de temps, après une
     animation. » Au retour à l'accueil, la page arrivait de côté pendant que
     la barre remontait du bas, en place 0,48 s plus tard.
   (v345) Une seule animation de changement d'écran, celle des Réglages :
   l'écran qui arrive passe PAR-DESSUS celui qu'on quitte, qui ne bouge pas ;
   au retour, l'écran repart et découvre celui où l'on revient, déjà posé.
   La barre du bas appartient à l'accueil : elle fait donc comme lui.
   (v356) Un écran ne glisse plus, il FOND (voir LE PASSAGE D'UN ÉCRAN À
   L'AUTRE EST UN FONDU) : la barre fond avec l'accueil, au même rythme,
   sans jamais bouger. Image par image :
     1. retour de Progression : la barre APPARAÎT avec l'accueil — à chaque
        image ni plus ni moins visible que lui, immobile, sans le moindre
        mouvement vertical ni de côté —, et entière à la fin ;
     2. départ vers Progression : elle S'EFFACE avec l'accueil — à chaque
        image ni plus ni moins visible que lui, immobile —, puis se range ;
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
      /* (v356) L'accueil, qu'il parte (screen-exit) ou qu'il arrive : son
         opacité, et celle de la barre. */
      const part = document.querySelector('#app > .screen.screen-exit'), arrive = document.querySelector('#app > .screen:not(.screen-exit)');
      const op = (e) => e ? +getComputedStyle(e).opacity : null;
      l.push({ t: performance.now() - t0, l: r.left, r: r.right, top: r.top, op: +getComputedStyle(b).opacity, cachee: b.classList.contains('cachee'),
        part: op(part), arrive: op(arrive), enRoute: !!passage });
      if (performance.now() - t0 < ms) requestAnimationFrame(tic); else res(l);
    };
    requestAnimationFrame(tic);
  }), [geste, ms]);

  /* ---- 2. départ ---- */
  const dep = await filme('openParcours()', 900);
  /* (v356) Elle s'efface AVEC l'accueil : à chaque image où il part, ni plus
     ni moins visible que lui ; et elle ne bouge pas tant qu'on la voit. */
  const fondD = dep.filter(x => x.part !== null && !x.cachee);
  const ecartD = fondD.length ? Math.max(...fondD.map(x => Math.abs(x.op - x.part))) : 99;
  const enCours = fondD.filter(x => x.part > 0.05 && x.part < 0.95).length;
  const bougeD = Math.max(0, ...dep.filter(x => !x.cachee && x.op > 0.01).map(x => Math.max(Math.abs(x.l - repos.l), Math.abs(x.top - repos.t))));
  dit('vers Progression, la barre s\'efface avec l\'accueil : à chaque image, ni plus ni moins visible que lui', enCours >= 2 && ecartD <= 0.06, fondD.length + ' images (' + enCours + ' en plein fondu), écart max ' + ecartD.toFixed(3));
  dit('… sans bouger d\'un pixel tant qu\'on la voit', bougeD <= 0.5, 'déplacement max ' + bougeD.toFixed(1) + ' px');
  dit('… puis se range', dep[dep.length - 1].cachee && dep[dep.length - 1].op === 1 && !dep[dep.length - 1].enRoute);
  await p.waitForTimeout(600);

  /* ---- 1. retour ---- */
  const ret = await filme('goToModeSelect()', 1000);
  const vertical = Math.max(0, ...ret.filter(x => !x.cachee && x.op > 0.01).map(x => Math.abs(x.top - repos.t)));
  const lateral = Math.max(0, ...ret.filter(x => !x.cachee && x.op > 0.01).map(x => Math.abs(x.l - repos.l)));
  /* (v356) Elle apparaît AVEC l'accueil qui arrive : ni plus ni moins
     visible que lui, à chaque image du passage. */
  const fondR = ret.filter(x => x.enRoute && x.arrive !== null && !x.cachee);
  const ecartR = fondR.length ? Math.max(...fondR.map(x => Math.abs(x.op - x.arrive))) : 99;
  const enCoursR = fondR.filter(x => x.arrive > 0.05 && x.arrive < 0.95).length;
  const der = ret[ret.length - 1];
  dit('au retour, la barre ne monte pas du bas : aucun mouvement vertical', vertical <= 0.5, 'écart vertical max ' + vertical.toFixed(1) + ' px');
  dit('… ni de côté : elle apparaît à sa place', lateral <= 0.5, 'écart latéral max ' + lateral.toFixed(1) + ' px');
  dit('… avec l\'accueil : à chaque image, ni plus ni moins visible que lui', enCoursR >= 2 && ecartR <= 0.06, fondR.length + ' images (' + enCoursR + ' en plein fondu), écart max ' + ecartR.toFixed(3));
  dit('… et entière à la fin', !der.cachee && der.op === 1 && !der.enRoute, JSON.stringify(der));
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
  console.log(ko ? '\n  ECHEC — ' + ko + ' point(s)' : '\n  OK — la barre fait ce que fait sa page : elle fond avec elle, jamais déplacée');
  process.exit(ko ? 1 : 0);
})();
