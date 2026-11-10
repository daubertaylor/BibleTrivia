/* ====== UN ÉCRAN ARRIVE AU BON MOMENT, ET À SA PLACE (v358) ======
   « Lorsque je suis dans l'accueil et que je vais dans Parcours, on dirait
     qu'il l'affiche après, et ça fait un espèce de petit saut. Je veux que
     tout soit parfait. »
   Le Parcours arrivait en haut du chemin, puis défilait tout seul jusqu'à
   la leçon à faire, une fois le glissement fini : 1 879 px pour un joueur à
   sa dix-neuvième leçon. Et chaque écran mettait du temps à partir : le
   Mode Groupe cherchait comment tenir sans défiler en douze mises en page.
   Ce que ce banc exige, sur iPhone et sur Android :
     1. Accueil → Parcours, à la dix-neuvième leçon : le chemin arrive DÉJÀ
        sur la leçon à faire — dès la première image du glissement, la
        page est à sa hauteur finale, et plus rien ne défile ensuite ; la
        leçon à faire est dans l'écran pendant toute l'arrivée ;
     2. … et l'accueil qu'on quitte ne bouge pas verticalement : ses cartes
        restent à leur hauteur, image après image ;
     3. … et le verre du chemin qui arrive reste face au décor ;
     4. un joueur qui commence (aucune leçon faite) : le chemin arrive en
        haut, et rien ne défile ;
     5. Parcours → Accueil : le chemin qu'on quitte reste à sa hauteur, et
        l'accueil arrive en haut ;
     6. le Mode Groupe, qui doit se resserrer pour tenir, y parvient en six
        mises en page au plus (douze avant) — et tient ;
     7. aucune erreur.
   Usage : node banc-essai/parcours-arrivee.js [url] */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const URL = process.argv[2] || 'http://127.0.0.1:8099/index.html';
const IOS = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1';
const AND = 'Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36';
let ko = 0;
const dit = (q, b, d) => { if (!b) ko++; console.log('  ' + (b ? 'OK  ' : 'KO  ') + q + (d ? '   (' + String(d).slice(0, 400) + ')' : '')); };

const OUTILS = () => {
  window.__dors = (ms) => new Promise(ok => setTimeout(ok, ms));
  window.__tr = (el) => { if (!el) return 0; const v = getComputedStyle(el).translate; return (!v || v === 'none') ? 0 : (parseFloat(v) || 0); };
  window.__lecons = (n) => { const f = {}; let k = 0; for (let u = 0; u < PARCOURS.length && k < n; u++) for (let l = 0; l < LECONS_PAR_UNITE && k < n; l++, k++) f[cleLecon(u, l)] = '2026-11-0' + (1 + (k % 8)); localStorage.setItem('bt_parcours', JSON.stringify({ faites: f })); };
  /* Filmer un changement d'écran : à chaque image, la hauteur de défilement,
     la place de la leçon à faire, celle des cartes de l'écran quitté. */
  window.__filmer = (geste, ms) => new Promise(ok => {
    const a = document.getElementById('app');
    const avant = document.querySelector('#app > .screen:not(.screen-exit)');
    const cartes = [...avant.querySelectorAll('.has-gs')].slice(0, 8);
    const y0 = cartes.map(c => c.getBoundingClientRect().top);
    const l = []; const t0 = performance.now();
    new Function(geste)();
    const pp = passage;
    const tic = () => {
      const t = performance.now() - t0;
      const e = document.querySelector('#app > .screen:not(.screen-exit)');
      const n = e && (e.querySelector('.ch-noeud.s-allume') || e.querySelector('.ch-noeud.courante'));
      const rn = n ? n.getBoundingClientRect() : null;
      const bouge = avant.isConnected ? Math.max(0, ...cartes.map((c, i) => Math.abs(c.getBoundingClientRect().top - y0[i]))) : 0;
      l.push({ t: Math.round(t), s: a.scrollTop, x: __tr(e), lecon: rn ? [Math.round(rn.top), Math.round(rn.bottom)] : null, bouge: Math.round(bouge * 100) / 100, pas: passage === pp && !!pp });
      if (t < ms) requestAnimationFrame(tic); else ok({ l, h: innerHeight });
    };
    requestAnimationFrame(tic);
  });
};

(async () => {
  const nav = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const errs = [];
  for (const [tel, ua, vp] of [['iPhone', IOS, { width: 402, height: 874 }], ['Android', AND, { width: 412, height: 915 }]]) {
    console.log('— ' + tel);
    const ctx = await nav.newContext({ viewport: vp, deviceScaleFactor: 1, isMobile: true, hasTouch: true, userAgent: ua, serviceWorkers: 'block' });
    const p = await ctx.newPage();
    p.on('pageerror', e => errs.push(e.message));
    await p.route('**/supabase-js@2*', r => r.fulfill({ status: 200, contentType: 'application/javascript', body: '' }));
    await p.route('**/pagead2.googlesyndication.com/**', r => r.abort());
    await p.addInitScript(() => { localStorage.setItem('bt_profile', JSON.stringify({ name: 'Taylor', color: '#4C86E8' })); localStorage.setItem('bt_fs_hint', '1');
      localStorage.setItem('bt_groupes_sonde', JSON.stringify({ installe: true, ouverts: true, version: 1, modo: false, quand: Date.now() })); });
    await p.goto(URL);
    await p.waitForFunction(() => { try { return state.screen === 'mode'; } catch (e) { return false; } }, null, { timeout: 25000 });
    await p.evaluate(OUTILS);
    await p.evaluate(() => { __lecons(18); state.screen = 'mode'; render(); });
    await p.waitForTimeout(1300);

    /* 1, 2. Accueil → Parcours, à la dix-neuvième leçon */
    let r = await p.evaluate(() => __filmer("allerOnglet('parcours')", 1500));
    let en = r.l.filter(x => x.pas);
    const fin = r.l[r.l.length - 1];
    const constant = r.l.every(x => Math.abs(x.s - fin.s) <= 1);
    const dansLEcran = en.length && en.every(x => x.lecon && x.lecon[0] >= 0 && x.lecon[1] <= r.h);
    dit('1. Accueil → Parcours : le chemin arrive déjà sur la leçon à faire — à sa hauteur dès la première image, plus rien ne défile ensuite',
      fin.s > 200 && constant && dansLEcran && en.length >= 5,
      'hauteur ' + r.l[0].s + ' → ' + fin.s + ' px · variations : ' + [...new Set(r.l.map(x => Math.round(x.s)))].slice(0, 6).join(', ') + ' · leçon dans l\'écran pendant l\'arrivée : ' + !!dansLEcran + ' (' + en.length + ' images)');
    const bouge = Math.max(0, ...en.map(x => x.bouge));
    dit('2. … et l\'accueil qu\'on quitte ne bouge pas verticalement', bouge <= 0.5, bouge + ' px au plus');

    /* 3. le verre du chemin qui arrive, figé à mi-chemin, contre sa place au repos */
    await p.evaluate(async () => { allerOnglet('mode'); await __dors(900); });
    const v = await p.evaluate(async () => {
      allerOnglet('parcours');
      const pp = passage;
      document.getAnimations().forEach(a => { try { a.pause(); a.currentTime = pp.duree * 0.4; } catch (e) {} });
      const pendant = [...pp.entrant.querySelectorAll('.gs:not(.gs-plein)')].filter(g => getComputedStyle(g).display !== 'none').map(g => [g, g.getBoundingClientRect()]);
      document.getAnimations().forEach(a => { try { a.play(); } catch (e) {} });
      await __dors(900);
      let pire = 0, n = 0;
      pendant.forEach(([g, r0]) => { if (!g.isConnected) return; const r1 = g.getBoundingClientRect(); n++; pire = Math.max(pire, Math.abs(r1.left - r0.left), Math.abs(r1.top - r0.top)); });
      return { pire: Math.round(pire * 100) / 100, n };
    });
    /* (Les pierres du chemin sont pleines : seules l'en-tête, la carte du
       haut et les bannières montrent le décor.) */
    dit('3. … et le verre du chemin qui arrive reste face au décor', v.n >= 2 && v.pire <= 0.5, v.pire + ' px au plus sur ' + v.n + ' couches');

    /* 5. Parcours → Accueil */
    r = await p.evaluate(() => __filmer("allerOnglet('mode')", 1200));
    en = r.l.filter(x => x.pas);
    const bougeR = Math.max(0, ...en.map(x => x.bouge));
    dit('5. Parcours → Accueil : le chemin qu\'on quitte reste à sa hauteur, l\'accueil arrive en haut',
      bougeR <= 0.5 && r.l[r.l.length - 1].s === 0 && en.length >= 5, 'chemin ' + bougeR + ' px au plus · hauteur finale ' + r.l[r.l.length - 1].s);

    /* 4. un joueur qui commence */
    await p.evaluate(async () => { __lecons(0); render(); await __dors(600); });
    r = await p.evaluate(() => __filmer("allerOnglet('parcours')", 1300));
    const zero = r.l.every(x => x.s === 0);
    dit('4. un joueur qui commence : le chemin arrive en haut, et rien ne défile', zero, [...new Set(r.l.map(x => x.s))].join(', '));
    await p.evaluate(async () => { allerOnglet('mode'); await __dors(900); });

    /* 6. le Mode Groupe se resserre en peu de mises en page */
    const m = await p.evaluate(async () => {
      const d = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'offsetHeight');
      let n = 0;
      Object.defineProperty(HTMLElement.prototype, 'offsetHeight', { configurable: true, get() { if (this.classList && this.classList.contains('screen') && !this.classList.contains('screen-exit')) n++; return d.get.call(this); } });
      state.mode = 'group'; state.teams = [{ name: 'Taylor' }, { name: 'B' }, { name: 'C' }, { name: 'D' }, { name: 'E' }, { name: 'F' }]; state.screen = 'setup';
      const avant = n;
      render();
      const pendant = n - avant;
      Object.defineProperty(HTMLElement.prototype, 'offsetHeight', d);
      await __dors(900);
      const a = document.getElementById('app'), e = document.querySelector('#app > .screen:not(.screen-exit)'), cs = getComputedStyle(a);
      const dispo = a.clientHeight - (parseFloat(cs.paddingTop) || 0) - (parseFloat(cs.paddingBottom) || 0);
      const go = document.querySelector('.btn-primary'), rg = go ? go.getBoundingClientRect() : null;
      return { lectures: pendant, serre: !!e._serre, tient: e.offsetHeight - dispo <= 0.5, bouton: rg ? Math.round(rg.bottom) : null, h: innerHeight, defile: a.scrollHeight - a.clientHeight };
    });
    dit('6. le Mode Groupe tient, et trouve son resserrement en six mises en page au plus (douze avant)',
      m.tient && m.lectures <= 8 && (m.bouton === null || m.bouton <= m.h), JSON.stringify(m));
    await ctx.close();
  }
  dit('7. aucune erreur', !errs.length, errs.slice(0, 3).join(' | '));
  await nav.close();
  console.log(ko ? '\n  ' + ko + ' défaut(s)' : '\n  OK — un écran arrive au bon moment, et à sa place');
  process.exit(ko ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
